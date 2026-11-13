package com.smartpricing.demo.generator;

import java.math.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;

public class DemoGenerator {
    public String version() { return DemoSeedConfig.VERSION; }
    public void validate(DemoSeedConfig config) { /* Legacy supports its documented seed/date options. */ }
    public String businessName() { return "Atlas Home & Pantry — Synthetic Demo"; }
    public BigDecimal minimumPrice(ProductPlan product) { return product.basePrice().multiply(new BigDecimal("0.50")); }
    public BigDecimal maximumPrice(ProductPlan product) { return product.basePrice().multiply(new BigDecimal("2.00")); }
    public boolean archived(ProductPlan product) { return product.scenario()==DemoScenario.ARCHIVE; }
    public record ProductPlan(DemoScenario scenario, int replica, String key, String sku, String name,
                              BigDecimal basePrice, BigDecimal baseCost) {}
    public record PeriodPlan(String key, BigDecimal amount, LocalDate from, LocalDate to, boolean authoritative) {}
    public record DailyPlan(LocalDate date, boolean observed, BigDecimal listedPrice, BigDecimal transactionPrice,
                            double latentDemand, int requestedUnits, int available, int observedSales) {}

    public List<ProductPlan> products() {
        List<ProductPlan> plans=new ArrayList<>();
        for(DemoScenario scenario:DemoScenario.values()) for(int replica=1;replica<=3;replica++) {
            BigDecimal price=BigDecimal.valueOf(80L+scenario.ordinal()*10L+replica*3L).setScale(4);
            plans.add(new ProductPlan(scenario,replica,scenario.name()+"/"+replica,
                    "DEMO-"+scenario.name()+"-"+replica,scenario.productName()+" "+replica,
                    price,price.multiply(new BigDecimal("0.45")).setScale(4,RoundingMode.UNNECESSARY)));
        }
        return List.copyOf(plans);
    }

    public List<PeriodPlan> prices(DemoSeedConfig config, ProductPlan product) {
        if(product.scenario()==DemoScenario.SPARSE) return List.of(
                new PeriodPlan("point-1",product.basePrice(),config.startDate().plusDays(9),null,false),
                new PeriodPlan("point-2",product.basePrice(),config.startDate().plusDays(162),null,false),
                new PeriodPlan("point-3",product.basePrice(),config.startDate().plusDays(347),null,false));
        List<PeriodPlan> periods=new ArrayList<>();
        for(int quarter=0;quarter<4;quarter++) periods.add(new PeriodPlan("quarter-"+quarter,
                price(product,quarter),config.startDate().plusMonths(quarter*3L),
                quarter==3?null:config.startDate().plusMonths((quarter+1)*3L),true));
        return periods;
    }

    public List<PeriodPlan> costs(DemoSeedConfig config, ProductPlan product) {
        if(product.scenario()==DemoScenario.SPARSE) return List.of();
        if(product.scenario()==DemoScenario.COST_CHANGE_UNKNOWN) return List.of(
                new PeriodPlan("known-before-gap",product.baseCost(),config.startDate(),config.startDate().plusMonths(3),true),
                new PeriodPlan("known-after-gap",cost(product,"1.10"),config.startDate().plusMonths(6),config.startDate().plusMonths(9),true),
                new PeriodPlan("current",cost(product,"1.20"),config.startDate().plusMonths(9),null,true));
        return List.of(new PeriodPlan("first-half",product.baseCost(),config.startDate(),config.startDate().plusMonths(6),true),
                new PeriodPlan("second-half",cost(product,"1.10"),config.startDate().plusMonths(6),null,true));
    }

    public DailyPlan day(DemoSeedConfig config, ProductPlan product, LocalDate date) {
        if(date.isBefore(config.startDate())||!date.isBefore(config.endExclusive())) throw new IllegalArgumentException("Date outside dataset.");
        long index=ChronoUnit.DAYS.between(config.startDate(),date);
        boolean sparse=product.scenario()==DemoScenario.SPARSE;
        boolean observed=!sparse||Set.of(9L,69L,162L,254L,347L).contains(index);
        int quarter=(int)(ChronoUnit.MONTHS.between(config.startDate(),date.withDayOfMonth(1))/3);
        BigDecimal listed=sparse?product.basePrice():price(product,quarter);
        boolean promotion=product.scenario()==DemoScenario.PROMOTION&&date.getDayOfMonth()>=10&&date.getDayOfMonth()<=16;
        BigDecimal transaction=promotion?listed.multiply(new BigDecimal("0.80")).setScale(4,RoundingMode.UNNECESSARY):listed;
        SplittableRandom noise=new SplittableRandom(mix(config.seed(),product.key(),date.toEpochDay()));
        double season=product.scenario()==DemoScenario.SEASONAL
                ?new double[]{0.60,0.65,0.80,1.00,1.20,1.50,1.80,1.80,1.20,0.90,0.70,0.60}[date.getMonthValue()-1]:1;
        double week=date.getDayOfWeek()==DayOfWeek.SATURDAY||date.getDayOfWeek()==DayOfWeek.SUNDAY?1.15:0.95;
        // Only a unitless price ratio enters latent-demand math. All stored money stays BigDecimal.
        double ratio=transaction.divide(product.basePrice(),MathContext.DECIMAL64).doubleValue();
        double latent=product.scenario().baseDemand()*(1+(product.replica()-1)*0.15)
                *StrictMath.pow(ratio,product.scenario().elasticity())*season*week*noise.nextDouble(0.90,1.10);
        boolean closed=product.scenario()==DemoScenario.ZERO_SALES&&index%7==0;
        boolean retired=product.scenario()==DemoScenario.ARCHIVE&&!date.isBefore(config.startDate().plusMonths(10));
        int requested=(int)StrictMath.floor(latent+noise.nextDouble());
        int available=sparse?5:Math.max(60,requested+10);
        if(product.scenario()==DemoScenario.STOCKOUT) {
            if(index>=150&&index<170) available=0;
            else if(index>=240&&index<255) available=3;
        }
        int sales=observed&&!closed&&!retired?Math.min(requested,available):0;
        return new DailyPlan(date,observed,listed,transaction,latent,requested,available,sales);
    }

    public boolean returned(ProductPlan product,long dayIndex) { return product.scenario()==DemoScenario.REFUND&&dayIndex%14==5; }
    public boolean adjusted(ProductPlan product,long dayIndex) { return product.scenario()==DemoScenario.REFUND&&dayIndex%31==10; }
    public Map<String,Object> groundTruth() {
        var rows=Arrays.stream(DemoScenario.values()).map(s->Map.of("scenario",s.name(),"elasticity",s.elasticity(),"baseDemand",s.baseDemand())).toList();
        return Map.of("generatorVersion",DemoSeedConfig.VERSION,"scenarios",rows,
                "formula","baseDemand * replicaFactor * priceRatio^elasticity * monthlySeasonality * weekdayFactor * seededNoise",
                "noiseRange",List.of(0.90,1.10),"observation","min(stochastically-rounded latent units, available inventory), subject to closures/retirement");
    }
    private BigDecimal price(ProductPlan product,int quarter) {
        return product.basePrice().multiply(new BigDecimal(new String[]{"1.00","1.10","1.30","1.00"}[quarter])).setScale(4,RoundingMode.UNNECESSARY);
    }
    private BigDecimal cost(ProductPlan product,String factor) { return product.baseCost().multiply(new BigDecimal(factor)).setScale(4,RoundingMode.UNNECESSARY); }
    private long mix(long seed,String key,long day) {
        long hash=0xcbf29ce484222325L;
        for(char character:key.toCharArray()) {hash^=character;hash*=0x100000001b3L;}
        long value=seed^hash^(day*0x9e3779b97f4a7c15L);
        value=(value^(value>>>30))*0xbf58476d1ce4e5b9L;
        value=(value^(value>>>27))*0x94d049bb133111ebL;
        return value^(value>>>31);
    }
}
