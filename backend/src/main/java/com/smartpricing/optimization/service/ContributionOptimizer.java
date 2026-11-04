package com.smartpricing.optimization.service;

import java.math.*;
import java.util.*;
import org.springframework.stereotype.Component;

@Component
public class ContributionOptimizer {
    public static final BigDecimal TICK=new BigDecimal("0.0001");
    private static final BigDecimal LIMIT=new BigDecimal("1E30");
    public record Input(BigDecimal referencePrice,BigDecimal referenceUnits,BigDecimal cost,double elasticity,
            BigDecimal lower,BigDecimal upper,BigDecimal stockCap) {}
    public record Projection(BigDecimal price,BigDecimal units,BigDecimal contribution) {}
    public Projection at(Input i,BigDecimal price) {
        if(i==null||i.referencePrice()==null||i.referenceUnits()==null||i.cost()==null||price==null
                ||i.referencePrice().signum()<=0||price.signum()<=0||i.referenceUnits().signum()<=0||i.cost().signum()<0
                ||!Double.isFinite(i.elasticity())||i.elasticity()>=0||i.stockCap()!=null&&i.stockCap().signum()<0)
            throw new IllegalArgumentException("Invalid model input");
        double response=Math.pow(price.divide(i.referencePrice(),MathContext.DECIMAL64).doubleValue(),i.elasticity());
        if(!Double.isFinite(response))throw new IllegalArgumentException("Nonfinite price response");
        BigDecimal units=i.referenceUnits().multiply(BigDecimal.valueOf(response));
        if(i.stockCap()!=null)units=units.min(i.stockCap());
        BigDecimal contribution=price.subtract(i.cost()).multiply(units);
        if(units.signum()<0||units.abs().compareTo(LIMIT)>0||contribution.abs().compareTo(LIMIT)>0)throw new IllegalArgumentException("Numeric output exceeds supported bounds");
        return new Projection(price,units,contribution);
    }
    public Projection optimize(Input i) {
        if(i==null||i.lower()==null||i.upper()==null||i.lower().signum()<=0||i.lower().compareTo(i.upper())>0)
            throw new IllegalArgumentException("Invalid bounds");
        BigDecimal lower=i.lower().max(i.cost()==null?BigDecimal.ZERO:i.cost()).setScale(4,RoundingMode.CEILING),upper=i.upper().setScale(4,RoundingMode.FLOOR);
        if(lower.compareTo(upper)>0||upper.compareTo(new BigDecimal("999999999999999.9999"))>0)throw new IllegalArgumentException("No representable feasible price");
        at(i,lower);TreeSet<BigDecimal> candidates=new TreeSet<>();candidates.add(lower);candidates.add(upper);
        if(i.elasticity()<-1) {
            BigDecimal e=BigDecimal.valueOf(i.elasticity());
            neighbors(candidates,e.multiply(i.cost()).divide(e.add(BigDecimal.ONE),MathContext.DECIMAL128),lower,upper);
        }
        if(i.stockCap()!=null&&i.stockCap().signum()>0) {
            double kink=i.referencePrice().doubleValue()*Math.pow(i.stockCap().divide(i.referenceUnits(),MathContext.DECIMAL64).doubleValue(),1/i.elasticity());
            if(Double.isFinite(kink))neighbors(candidates,BigDecimal.valueOf(kink),lower,upper);
        }
        Projection best=null;
        for(BigDecimal candidate:candidates){var p=at(i,candidate);if(best==null||p.contribution().compareTo(best.contribution())>0)best=p;}
        return best;
    }
    private void neighbors(Set<BigDecimal> candidates,BigDecimal point,BigDecimal lower,BigDecimal upper) {
        for(RoundingMode rounding:List.of(RoundingMode.FLOOR,RoundingMode.CEILING))for(int offset=-1;offset<=1;offset++) {
            BigDecimal price=point.setScale(4,rounding).add(TICK.multiply(BigDecimal.valueOf(offset)));
            if(price.compareTo(lower)>=0&&price.compareTo(upper)<=0)candidates.add(price);
        }
    }
    public static String decimal(BigDecimal value){return value==null?null:value.setScale(4,RoundingMode.HALF_UP).toPlainString();}
}
