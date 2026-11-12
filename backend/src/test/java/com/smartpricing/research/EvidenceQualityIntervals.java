package com.smartpricing.research;
import com.smartpricing.forecasting.dto.ForecastDtos.Day;
import com.smartpricing.forecasting.service.ControlledElasticity;
import java.util.*;
final class EvidenceQualityIntervals {
 record Interval(double low,double high,int valid){}
 static List<Day> eligible(List<Day> r){return r.stream().filter(d->d.units()>0&&d.effectivePrice()!=null&&!d.censored()&&d.availability().equals("IN_STOCK")).toList();}
 static Interval wald(List<Day> r){try{var f=ControlledElasticity.fit(eligible(r),1e-8);double se=f.rmse()/(f.residualPriceSd()*Math.sqrt(f.degreesOfFreedom()));return new Interval(f.beta()-1.96*se,f.beta()+1.96*se,1);}catch(IllegalArgumentException e){return null;}}
 static Interval bootstrap(List<Day> rows,long seed,int block){var source=eligible(rows);if(source.size()<130)return null;Random random=new Random(seed);List<Double> fits=new ArrayList<>();for(int b=0;b<99;b++){List<Day> sample=new ArrayList<>();while(sample.size()<source.size()){int start=random.nextInt(source.size());for(int j=0;j<block&&sample.size()<source.size();j++)sample.add(source.get((start+j)%source.size()));}sample.sort(Comparator.comparing(Day::date));try{fits.add(ControlledElasticity.fit(sample,1e-8).beta());}catch(IllegalArgumentException ignored){}}if(fits.size()<80)return null;Collections.sort(fits);return new Interval(fits.get((int)Math.floor(.025*(fits.size()-1))),fits.get((int)Math.ceil(.975*(fits.size()-1))),fits.size());}
 private EvidenceQualityIntervals(){}
}
