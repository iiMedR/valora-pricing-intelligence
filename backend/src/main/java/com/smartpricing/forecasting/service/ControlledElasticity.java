package com.smartpricing.forecasting.service;

import com.smartpricing.forecasting.dto.ForecastDtos.Day;
import java.time.temporal.ChronoUnit;
import java.util.*;

/** Fixed specification; no data-driven feature search or future observations. */
public final class ControlledElasticity {
    public static final String VERSION="weekday-season-trend-qr-v2";
    public record Fit(double beta,double rmse,double calendarR2,double residualPriceSd,int degreesOfFreedom,Double maxPriceMeanResidual) {}
    public static Fit fit(List<Day> days,double tolerance) {
        int n=days.size(),k=13;
        if(n<Math.max(90,10*k))throw new IllegalArgumentException("Insufficient effective sample size");
        double[][] x=new double[n][k];double[] y=new double[n];
        double reference=Double.parseDouble(days.getFirst().effectivePrice());
        for(int i=0;i<n;i++) {
            var d=days.get(i);double phase=2*Math.PI*(d.date().getDayOfYear()-1)/365.2425;
            x[i][0]=1;
            for(int j=1;j<=6;j++)x[i][j]=d.date().getDayOfWeek().getValue()==j?1:0;
            x[i][7]=Math.sin(phase);x[i][8]=Math.cos(phase);x[i][9]=Math.sin(2*phase);x[i][10]=Math.cos(2*phase);
            x[i][11]=ChronoUnit.DAYS.between(days.getFirst().date(),d.date())/365.2425-.5;
            x[i][12]=Math.log(Double.parseDouble(d.effectivePrice())/reference);y[i]=Math.log(d.units());
        }
        double[][] q=new double[k][n],r=new double[k][k];double residualPrice=0,variance=0;
        for(int col=0;col<k;col++) {
            double[] v=new double[n];for(int i=0;i<n;i++)v[i]=x[i][col];
            for(int pass=0;pass<2;pass++)for(int j=0;j<col;j++){
                double dot=0;for(int i=0;i<n;i++)dot+=q[j][i]*v[i];
                r[j][col]+=dot;for(int i=0;i<n;i++)v[i]-=dot*q[j][i];
            }
            double norm=0;for(double value:v)norm+=value*value;norm=Math.sqrt(norm);
            if(!Double.isFinite(norm)||norm<tolerance*Math.sqrt(n))throw new IllegalArgumentException("Rank deficient controls");
            r[col][col]=norm;for(int i=0;i<n;i++)q[col][i]=v[i]/norm;
            if(col==k-1){residualPrice=norm*norm;double mean=Arrays.stream(x).mapToDouble(row->row[k-1]).average().orElse(0);for(var row:x)variance+=Math.pow(row[k-1]-mean,2);}
        }
        double[] b=new double[k];for(int j=0;j<k;j++)for(int i=0;i<n;i++)b[j]+=q[j][i]*y[i];
        for(int j=k-1;j>=0;j--){for(int l=j+1;l<k;l++)b[j]-=r[j][l]*b[l];b[j]/=r[j][j];}
        Map<String,double[]> tiers=new HashMap<>();
        double error=0;for(int i=0;i<n;i++){
            double p=0;for(int j=0;j<k;j++)p+=x[i][j]*b[j];double residual=y[i]-p;error+=residual*residual;
            String price=new java.math.BigDecimal(days.get(i).effectivePrice()).stripTrailingZeros().toPlainString();
            var tier=tiers.computeIfAbsent(price,key->new double[2]);tier[0]+=residual;tier[1]++;
        }
        var replicated=tiers.values().stream().filter(t->t[1]>=15).toList();
        Double shape=replicated.size()<3?null:replicated.stream().mapToDouble(t->Math.abs(t[0]/t[1])).max().orElseThrow();
        return new Fit(b[k-1],Math.sqrt(error/n),variance==0?1:Math.max(0,1-residualPrice/variance),Math.sqrt(residualPrice/n),n-k,shape);
    }
    private ControlledElasticity() {}
}
