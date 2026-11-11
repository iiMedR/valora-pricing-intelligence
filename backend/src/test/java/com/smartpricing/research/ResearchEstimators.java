package com.smartpricing.research;

import com.smartpricing.forecasting.dto.ForecastDtos.Day;
import java.time.YearMonth;
import java.util.*;

/** Research-only conditional empirical Bayes, not a new production estimator. */
final class ResearchEstimators {
    record Estimate(double mean,double low,double high,double sd,double priorShare,double residualSxx,int residualDf) {}
    record Sufficient(double xx,double xy,double yy,int df) {}
    static Sufficient summarize(List<Day> rows) {
        Map<String,List<double[]>> strata=new HashMap<>();int n=0;
        for(Day day:rows)if(day.effectivePrice()!=null&&day.availability().equals("IN_STOCK")&&!day.censored()) {
            double p=Double.parseDouble(day.effectivePrice());if(p<=0)continue;
            strata.computeIfAbsent(YearMonth.from(day.date())+"/"+day.date().getDayOfWeek(),key->new ArrayList<>()).add(new double[]{Math.log(p/100),Math.log1p(day.units())});n++;
        }
        double xx=0,xy=0,yy=0;
        for(var group:strata.values()) {
            double mx=group.stream().mapToDouble(a->a[0]).average().orElse(0),my=group.stream().mapToDouble(a->a[1]).average().orElse(0);
            for(double[] v:group){xx+=(v[0]-mx)*(v[0]-mx);xy+=(v[0]-mx)*(v[1]-my);yy+=(v[1]-my)*(v[1]-my);}
        }
        return new Sufficient(xx,xy,yy,Math.max(0,n-strata.size()-1));
    }
    static Estimate posterior(List<Day> observations,double priorMean,double priorSd) {
        Sufficient s=summarize(observations);
        double noise=s.df()<2?1:Math.max(.05*.05,(s.yy()-(s.xx()>1e-12?s.xy()*s.xy()/s.xx():0))/s.df());
        double priorPrecision=1/(priorSd*priorSd),dataPrecision=s.xx()/noise;
        double variance=1/(priorPrecision+dataPrecision),mean=variance*(priorPrecision*priorMean+s.xy()/noise),sd=Math.sqrt(variance);
        return new Estimate(mean,mean-1.96*sd,mean+1.96*sd,sd,priorPrecision/(priorPrecision+dataPrecision),s.xx(),s.df());
    }
    static Estimate pooled(List<Day> focal,List<List<Day>> donors) {
        // Donors alone determine hyperparameters. No target outcomes, labels or truth enter here.
        var means=donors.stream().map(d->posterior(d,-1.5,2)).mapToDouble(Estimate::mean).toArray();
        double mu=Arrays.stream(means).average().orElse(-1.5),variance=0;for(double m:means)variance+=(m-mu)*(m-mu);
        double sd=Math.sqrt(Math.max(.25*.25,means.length<2?4:variance/(means.length-1)));
        return posterior(focal,mu,sd);
    }
    static double plugin(double beta) {
        if(!Double.isFinite(beta)||beta>=0)return Double.NaN;
        return Math.max(90,Math.min(110,beta < -1?beta*40/(beta+1):110));
    }
    private ResearchEstimators() {}
}
