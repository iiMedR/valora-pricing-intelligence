package com.smartpricing.forecasting.service;

import com.smartpricing.forecasting.dto.ForecastDtos.*;
import java.math.*;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Component;

@Component
public class DemandModel {
    private final ForecastSettings settings;
    public DemandModel(ForecastSettings settings) { this.settings=settings; }
    public record Analysis(List<Day> history,Readiness readiness,Elasticity elasticity) {}
    public Analysis analyze(List<Day> raw) {
        List<Long> positive=raw.stream().filter(d->d.units()>0&&!d.censored()&&d.availability().equals("IN_STOCK")).map(Day::units).sorted().toList();
        double median=positive.isEmpty()?0:positive.get(positive.size()/2);
        List<Day> history=new ArrayList<>(),fit=new ArrayList<>();int unknown=0,censored=0,zero=0,missing=0,discrepancy=0,outlier=0;
        for(Day d:raw) {
            List<String> flags=new ArrayList<>();
            if(d.availability().equals("UNKNOWN")){unknown++;flags.add("UNKNOWN_INVENTORY");}
            if(d.censored()){censored++;flags.add("CENSORED_STOCK");}
            double price=d.effectivePrice()==null?0:new BigDecimal(d.effectivePrice()).doubleValue();
            if(!Double.isFinite(price)||price<=0){missing++;flags.add("MISSING_OR_INVALID_PRICE");}
            if(d.listedPrice()!=null&&price>0) {
                double listed=new BigDecimal(d.listedPrice()).doubleValue();
                if(listed<=0||Math.abs(price/listed-1)>settings.maxPriceDiscrepancy()) {discrepancy++;flags.add("PRICE_DISCREPANCY");}
            }
            if(median>0&&d.units()>median*settings.outlierFactor()){outlier++;flags.add("OUTLIER");}
            if(flags.isEmpty()&&d.units()==0){zero++;flags.add("ZERO_SALES_SELECTION");}
            var enriched=new Day(d.date(),d.units(),d.returnedUnits(),d.listedPrice(),d.effectivePrice(),d.priceSource(),d.availability(),d.observedStock(),d.censored(),List.copyOf(flags));
            history.add(enriched);if(flags.isEmpty())fit.add(enriched);
        }
        var prices=fit.stream().map(d->new BigDecimal(d.effectivePrice())).distinct().sorted().toList();
        List<String> reasons=new ArrayList<>(List.of("OBSERVATIONAL_ASSOCIATION","NO_CALIBRATED_INTERVAL","CONTINUOUS_AVAILABILITY_NOT_PROVEN"));
        List<String> blockers=new ArrayList<>();
        if(fit.size()<settings.minFitDays())blockers.add("TOO_FEW_ELIGIBLE_DAYS");
        if(prices.size()<settings.minDistinctPrices())blockers.add("INSUFFICIENT_DISTINCT_PRICES");
        if(prices.isEmpty()||prices.getLast().doubleValue()/prices.getFirst().doubleValue()-1<settings.minSpread())blockers.add("INSUFFICIENT_PRICE_SPREAD");
        if(!raw.isEmpty()&&(double)unknown/raw.size()>settings.maxUnknownShare())blockers.add("EXCESS_UNKNOWN_INVENTORY");
        if(!raw.isEmpty()&&(double)censored/raw.size()>settings.maxCensoredShare())blockers.add("EXCESS_CENSORING");
        if(zero>0)blockers.add("ZERO_SALES_SELECTION");
        if(discrepancy>0)reasons.add("PRICE_DISCREPANCY_CONFOUNDING");
        if(censored>0)reasons.add("CENSORED_DAYS_EXCLUDED");
        Double estimate=null,rmse=null;
        if(blockers.isEmpty()) {
            try {
                Fit fitted=fit(fit);rmse=finite(fitted.rmse());
                if(fitted.calendarExplainedPrice()>0.70)reasons.add("PRICE_CALENDAR_CONFOUNDING_RISK");
                if(fitted.calendarExplainedPrice()>0.95)blockers.add("PRICE_CALENDAR_COLLINEARITY");
                if(!Double.isFinite(fitted.beta())||!Double.isFinite(fitted.rmse()))blockers.add("NONFINITE_FIT");
                else if(fitted.beta()>=0)blockers.add("POSITIVE_ASSOCIATION_UNRELIABLE");
                else if(Math.abs(fitted.beta())>settings.maxAbsoluteElasticity())blockers.add("IMPLAUSIBLE_ASSOCIATION");
                if(fitted.rmse()>settings.maxLogRmse())blockers.add("UNSTABLE_RESIDUALS");
                if(blockers.isEmpty())estimate=finite(fitted.beta());
            } catch(IllegalArgumentException exception) {blockers.add("COLLINEAR_DESIGN");}
        }
        reasons.addAll(blockers);
        boolean baseline=recent(history).size()>=settings.minBaselineDays();
        String status=!baseline?"INSUFFICIENT_DATA":estimate==null?"BASELINE_ONLY":"READY";
        if(!baseline)reasons.add("INSUFFICIENT_RECENT_BASELINE");
        Readiness readiness=new Readiness(status,raw.size(),fit.size(),unknown,censored,zero,missing,discrepancy,outlier,prices.size(),prices.isEmpty()?null:prices.getFirst().toPlainString(),prices.isEmpty()?null:prices.getLast().toPlainString(),List.copyOf(reasons));
        return new Analysis(List.copyOf(history),readiness,new Elasticity(estimate==null?status:"READY","calendar-log-ols-v1",estimate,rmse,fit.size(),null,null,readiness,List.copyOf(reasons)));
    }
    private List<Day> recent(List<Day> history) {
        if(history.isEmpty())return List.of();
        LocalDate from=history.getLast().date().plusDays(1).minusDays(settings.lookbackDays());
        return history.stream().filter(d->!d.date().isBefore(from)&&d.availability().equals("IN_STOCK")&&!d.censored()&&!d.exclusions().contains("OUTLIER")).toList();
    }
    public Forecast forecast(List<Day> raw,LocalDate cutoff,int horizon,boolean archived) {
        var analysis=analyze(raw);List<Day> recent=recent(analysis.history());List<String> reasons=new ArrayList<>();
        String price=raw.stream().filter(d->d.listedPrice()!=null).reduce((a,b)->b).map(Day::listedPrice).orElse(null);
        if(archived||recent.size()<settings.minBaselineDays())return new Forecast("INSUFFICIENT_DATA","weekday-mean-v1","OBSERVED_SALES_CONDITIONAL_ON_AVAILABILITY",price,null,List.of(),List.of(archived?"CURRENTLY_ARCHIVED":"INSUFFICIENT_RECENT_BASELINE"));
        reasons.addAll(List.of("PRICE_HELD_CONSTANT_ASSUMPTION","NO_CALIBRATED_INTERVAL","NOT_LATENT_DEMAND","NO_PRICE_RESPONSE_ADJUSTMENT"));
        if(price==null)reasons.add("ASSUMED_LISTED_PRICE_UNKNOWN");
        if(recent.stream().anyMatch(d->d.censored()||d.availability().equals("UNKNOWN")))throw new IllegalStateException("Invalid baseline input");
        var distinct=recent.stream().map(Day::effectivePrice).filter(Objects::nonNull).distinct().count();
        if(distinct>1)reasons.add("RECENT_PRICE_MIX_MAY_DIFFER_FROM_ASSUMPTION");
        double overall=recent.stream().mapToLong(Day::units).average().orElseThrow();
        List<Point> daily=new ArrayList<>();BigDecimal total=BigDecimal.ZERO;
        for(int offset=0;offset<horizon;offset++) {
            LocalDate date=cutoff.plusDays(offset);var weekday=recent.stream().filter(d->d.date().getDayOfWeek()==date.getDayOfWeek()).toList();
            double prediction=weekday.size()<settings.minWeekdaySamples()?overall:weekday.stream().mapToLong(Day::units).average().orElse(overall);
            BigDecimal amount=BigDecimal.valueOf(Math.max(0,prediction)).setScale(4,RoundingMode.HALF_UP);total=total.add(amount);
            daily.add(new Point(date,amount.toPlainString(),null,null));
        }
        return new Forecast(analysis.elasticity().estimate()==null?"BASELINE_ONLY":"READY","weekday-mean-v1","OBSERVED_SALES_CONDITIONAL_ON_AVAILABILITY",price,total.toPlainString(),daily,List.copyOf(reasons));
    }
    public List<Fold> backtest(List<Day> history,LocalDate end,int horizon) {
        List<Fold> folds=new ArrayList<>();
        for(int offset=2;offset>=1;offset--) {
            LocalDate cutoff=end.minusDays((long)horizon*offset),until=cutoff.plusDays(horizon);
            // Recompute flags/medians from each prefix, never from the full-window diagnostics.
            var training=history.stream().filter(d->d.date().isBefore(cutoff)).toList();
            var prediction=forecast(training,cutoff,horizon,false);
            var actual=history.stream().filter(d->!d.date().isBefore(cutoff)&&d.date().isBefore(until)).toList();
            var eligible=recent(analyze(training).history());
            if(prediction.daily().isEmpty()||actual.size()!=horizon){folds.add(new Fold(cutoff,until,"INSUFFICIENT_DATA",eligible.size(),actual.size(),0,0,0,null,null,List.of(),List.of("INSUFFICIENT_CHRONOLOGICAL_TRAINING")));continue;}
            double naive=eligible.stream().mapToLong(Day::units).average().orElseThrow();
            List<TestPoint> points=new ArrayList<>();int censored=0,unknown=0;long total=0;double abs=0,bias=0,naiveAbs=0,naiveBias=0;BigDecimal predicted=BigDecimal.ZERO;
            for(int i=0;i<actual.size();i++) {
                Day d=actual.get(i);String value=prediction.daily().get(i).expectedUnits();double p=Double.parseDouble(value);
                total+=d.units();if(d.censored())censored++;if(d.availability().equals("UNKNOWN"))unknown++;
                abs+=Math.abs(p-d.units());bias+=p-d.units();naiveAbs+=Math.abs(naive-d.units());naiveBias+=naive-d.units();predicted=predicted.add(new BigDecimal(value));
                points.add(new TestPoint(d.date(),d.units(),value,BigDecimal.valueOf(naive).setScale(4,RoundingMode.HALF_UP).toPlainString(),d.availability()));
            }
            folds.add(new Fold(cutoff,until,"EVALUATED",eligible.size(),actual.size(),censored,unknown,total,
                    new ErrorMetrics(finite(abs/horizon),total==0?null:finite(abs/total*100),finite(bias/horizon),predicted.toPlainString()),
                    new ErrorMetrics(finite(naiveAbs/horizon),total==0?null:finite(naiveAbs/total*100),finite(naiveBias/horizon),BigDecimal.valueOf(naive*horizon).setScale(4,RoundingMode.HALF_UP).toPlainString()),points,List.of("OBSERVED_SALES_NOT_LATENT","EVENT_TIME_NOT_IMPORT_ARRIVAL")));
        }
        return folds;
    }
    private record Fit(double beta,double rmse,double calendarExplainedPrice) {}
    private Fit fit(List<Day> days) {
        int n=days.size(),k=7;double[][] x=new double[n][k];double[] y=new double[n];
        double reference=new BigDecimal(days.getFirst().effectivePrice()).doubleValue();
        for(int i=0;i<n;i++) {
            Day d=days.get(i);double phase=2*Math.PI*(d.date().getDayOfYear()-1)/365.2425;
            x[i]=new double[]{1,d.date().getDayOfWeek().getValue()>=6?1:0,Math.sin(phase),Math.cos(phase),Math.sin(2*phase),Math.cos(2*phase),Math.log(new BigDecimal(d.effectivePrice()).doubleValue()/reference)};
            y[i]=Math.log(d.units());
        }
        double[][] q=new double[k][n],r=new double[k][k];double priceResidual=0,priceVariance=0;
        for(int col=0;col<k;col++) {
            double[] v=new double[n];for(int i=0;i<n;i++)v[i]=x[i][col];
            for(int pass=0;pass<2;pass++)for(int j=0;j<col;j++){double dot=0;for(int i=0;i<n;i++)dot+=q[j][i]*v[i];r[j][col]+=dot;for(int i=0;i<n;i++)v[i]-=dot*q[j][i];}
            double norm=0;for(double value:v)norm+=value*value;norm=Math.sqrt(norm);
            if(norm<settings.rankTolerance()*Math.sqrt(n))throw new IllegalArgumentException("Rank deficient");
            r[col][col]=norm;for(int i=0;i<n;i++)q[col][i]=v[i]/norm;
            if(col==k-1){priceResidual=norm*norm;double mean=Arrays.stream(x).mapToDouble(row->row[k-1]).average().orElse(0);for(double[] row:x)priceVariance+=(row[k-1]-mean)*(row[k-1]-mean);}
        }
        double[] coefficients=new double[k];for(int col=0;col<k;col++)for(int i=0;i<n;i++)coefficients[col]+=q[col][i]*y[i];
        for(int col=k-1;col>=0;col--){for(int j=col+1;j<k;j++)coefficients[col]-=r[col][j]*coefficients[j];coefficients[col]/=r[col][col];}
        double residual=0;for(int i=0;i<n;i++){double predicted=0;for(int j=0;j<k;j++)predicted+=x[i][j]*coefficients[j];residual+=(y[i]-predicted)*(y[i]-predicted);}
        return new Fit(coefficients[k-1],Math.sqrt(residual/n),priceVariance==0?1:1-priceResidual/priceVariance);
    }
    private Double finite(double value) {return !Double.isFinite(value)?null:BigDecimal.valueOf(value).setScale(6,RoundingMode.HALF_UP).doubleValue();}
}
