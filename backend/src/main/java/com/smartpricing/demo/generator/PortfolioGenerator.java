package com.smartpricing.demo.generator;

import java.math.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;

/** Frozen synthetic portfolio stories. Truth metadata is never an optimizer input. */
public final class PortfolioGenerator extends DemoGenerator {
    public static final String VERSION="portfolio-v1";
    public static final long SEED=20251114L;
    @Override public void validate(DemoSeedConfig config) {
        if(config.seed()!=SEED||!config.startDate().equals(DemoSeedConfig.DEFAULT_START))
            throw com.smartpricing.common.ApiException.invalid("portfolio-v1 requires seed20251114 and start2025-01-01; use a new version for a changed design.");
    }
    @Override public String version() { return VERSION; }
    @Override public String businessName() { return "Atlas Goods — Synthetic Portfolio"; }
    @Override public boolean archived(ProductPlan p) { return p.scenario()==DemoScenario.ARCHIVE&&p.replica()==1; }
    @Override public BigDecimal minimumPrice(ProductPlan p) {
        return p.basePrice().multiply(new BigDecimal(p.scenario()==DemoScenario.ZERO_SALES&&p.replica()==3?"0.95":"0.50"));
    }
    @Override public BigDecimal maximumPrice(ProductPlan p) {
        return p.basePrice().multiply(new BigDecimal(p.scenario()==DemoScenario.ARCHIVE&&p.replica()==3?"1.05":"2.00"));
    }
    @Override public List<ProductPlan> products() {
        List<ProductPlan> result=new ArrayList<>();
        for(var group:DemoScenario.values()) for(int replica=1;replica<=3;replica++) {
            BigDecimal price=money(80+7*group.ordinal()+10*replica);
            String factor=group==DemoScenario.COST_CHANGE_UNKNOWN&&replica==3?"0.60":group==DemoScenario.ARCHIVE&&replica==2?"0.50":"0.40";
            BigDecimal cost=group==DemoScenario.SPARSE?null:price.multiply(new BigDecimal(factor)).setScale(4);
            result.add(new ProductPlan(group,replica,"portfolio/"+group+"/"+replica,"PORT-"+group+"-"+replica,
                    group.productName()+" · "+new String[]{"Classic","Studio","Travel"}[replica-1],price,cost));
        }
        return List.copyOf(result);
    }
    public double beta(ProductPlan p) {
        return switch(p.scenario()) {
            case ELASTIC_HIGH -> new double[]{-2,-2.6,-3}[p.replica()-1];
            case ELASTIC_LOW -> new double[]{-.25,-.6,0}[p.replica()-1];
            case SEASONAL -> -1-.1*p.replica();
            case PROMOTION -> new double[]{-.25,-1.2,-.3}[p.replica()-1];
            case STOCKOUT -> p.replica()==1?-1.4:-2;
            case SPARSE -> -.9;
            case REFUND -> p.replica()==2?-1.5:-2;
            case COST_CHANGE_UNKNOWN -> -2;
            case ARCHIVE -> p.replica()==3?-.25:-2;
            case ZERO_SALES -> new double[]{-1.2,-5.0/3,-2}[p.replica()-1];
        };
    }
    public BigDecimal trueCost(ProductPlan p) {
        if(p.scenario()==DemoScenario.COST_CHANGE_UNKNOWN&&p.replica()==2)return p.basePrice().multiply(new BigDecimal("0.60"));
        return p.baseCost()==null?p.basePrice().multiply(new BigDecimal("0.40")):p.baseCost();
    }
    public double referenceUnits(ProductPlan p) { return 40*(1+.1*(p.replica()-1)); }
    private long index(DemoSeedConfig c,LocalDate d) { return ChronoUnit.DAYS.between(c.startDate(),d); }
    private long mixed(DemoSeedConfig c,ProductPlan p,long day,long stream) {
        long x=c.seed()^((long)p.key().hashCode()<<32)^day*0x9e3779b97f4a7c15L^stream;
        x=(x^(x>>>30))*0xbf58476d1ce4e5b9L;x=(x^(x>>>27))*0x94d049bb133111ebL;return x^(x>>>31);
    }
    private BigDecimal price(DemoSeedConfig c,ProductPlan p,LocalDate date) {
        long i=index(c,date);double factor;
        if(p.scenario()==DemoScenario.SEASONAL)factor=new double[]{.8,1,1.2,1}[(int)(ChronoUnit.MONTHS.between(c.startDate(),date.withDayOfMonth(1))/3)];
        else if(i>=ChronoUnit.DAYS.between(c.startDate(),c.endExclusive())-56)factor=1;
        else factor=new double[]{.8,1,1.2}[new SplittableRandom(mixed(c,p,i/7,17)).nextInt(3)];
        return p.basePrice().multiply(BigDecimal.valueOf(factor)).setScale(4,RoundingMode.HALF_UP);
    }
    @Override public List<PeriodPlan> prices(DemoSeedConfig c,ProductPlan p) {
        List<PeriodPlan> result=new ArrayList<>();LocalDate from=c.startDate();BigDecimal prior=price(c,p,from);
        for(LocalDate d=from.plusDays(1);d.isBefore(c.endExclusive());d=d.plusDays(1)) {
            BigDecimal next=price(c,p,d);
            if(next.compareTo(prior)!=0){result.add(new PeriodPlan(from.toString(),prior,from,d,true));from=d;prior=next;}
        }
        result.add(new PeriodPlan(from.toString(),prior,from,null,true));return List.copyOf(result);
    }
    @Override public List<PeriodPlan> costs(DemoSeedConfig c,ProductPlan p) {
        if(p.baseCost()==null)return List.of();List<PeriodPlan> result=new ArrayList<>();
        // Quarterly verified cost attestations; constant cost is not an unreviewed year-old input.
        for(int q=0;q<4;q++) {
            if(p.scenario()==DemoScenario.COST_CHANGE_UNKNOWN&&p.replica()==1&&q==1)continue;
            result.add(new PeriodPlan("review-"+q,p.baseCost(),c.startDate().plusMonths(q*3L),q==3?null:c.startDate().plusMonths((q+1)*3L),true));
        }
        return List.copyOf(result);
    }
    @Override public DailyPlan day(DemoSeedConfig c,ProductPlan p,LocalDate date) {
        if(date.isBefore(c.startDate())||!date.isBefore(c.endExclusive()))throw new IllegalArgumentException("Outside portfolio period");
        long i=index(c,date),length=ChronoUnit.DAYS.between(c.startDate(),c.endExclusive());boolean observed=true;
        if(p.scenario()==DemoScenario.SPARSE) {
            int count=new int[]{5,20,50}[p.replica()-1];observed=false;
            for(int k=0;k<count;k++)if(i==k*(length-1)/(count-1)){observed=true;break;}
        }
        BigDecimal listed=price(c,p,date),transaction=listed;
        if(p.scenario()==DemoScenario.PROMOTION&&p.replica()==2&&date.getDayOfMonth()>=10&&date.getDayOfMonth()<=16)
            transaction=listed.multiply(new BigDecimal("0.80")).setScale(4);
        double response=beta(p);
        if(p.scenario()==DemoScenario.PROMOTION&&p.replica()==1)response=-2; // Own -.25 plus hidden marketing -1.75.
        if(p.scenario()==DemoScenario.PROMOTION&&p.replica()==3&&i<length/2)response=-2.6;
        double weekday=date.getDayOfWeek().getValue()<=2?1.3:date.getDayOfWeek().getValue()>=6?.8:1;
        double season=p.scenario()==DemoScenario.SEASONAL?.7+.06*(date.getMonthValue()-1):1;
        Random random=new Random(mixed(c,p,i,83));
        double latent=referenceUnits(p)*StrictMath.pow(transaction.divide(p.basePrice(),MathContext.DECIMAL64).doubleValue(),response)
                *weekday*season*StrictMath.exp(.06*random.nextGaussian());
        int requested=poisson(random,latent),stock=10000;
        if(p.scenario()==DemoScenario.STOCKOUT) {
            if(p.replica()==1&&i%3==0)stock=5;
            if(p.replica()==2&&i>=length-14)stock=0;
            if(p.replica()==3&&i==length-1)stock=10;
        }
        int sold=observed?Math.min(stock,requested):0;
        if(p.scenario()==DemoScenario.ZERO_SALES&&p.replica()==1&&i%7==0)sold=0;
        return new DailyPlan(date,observed,listed,transaction,latent,requested,stock,sold);
    }
    private int poisson(Random random,double mean) {
        int total=0;while(mean>0){double chunk=Math.min(20,mean),limit=StrictMath.exp(-chunk),product=1;int k=0;
            do{k++;product*=random.nextDouble();}while(product>limit);total+=k-1;mean-=chunk;}return total;
    }
    @Override public boolean returned(ProductPlan p,long i) { return p.scenario()==DemoScenario.REFUND&&i%31==5; }
    @Override public boolean adjusted(ProductPlan p,long i) { return p.scenario()==DemoScenario.REFUND&&i%61==10; }
    public String evidence(ProductPlan p) {
        return switch(p.scenario()) {
            case SEASONAL,PROMOTION,ZERO_SALES -> p.scenario()==DemoScenario.ZERO_SALES&&p.replica()>1?"INDEPENDENT_CONSTRAINED":"CONFOUNDED_OR_SELECTION";
            case SPARSE -> "INSUFFICIENT_MISSING_COST";
            case STOCKOUT -> "STOCK_CONSTRAINED";
            case COST_CHANGE_UNKNOWN -> p.replica()==2?"INCORRECT_COST_WITNESS":"INDEPENDENT_COST_CONTEXT";
            case ARCHIVE -> p.replica()==1?"INACTIVE":"INDEPENDENT_CONSTRAINED";
            case REFUND -> "INDEPENDENT_REFUND_OBJECTIVE_LIMIT";
            default -> "INDEPENDENT_WEEKLY_ASSIGNMENT";
        };
    }
    @Override public Map<String,Object> groundTruth() {
        List<Map<String,Object>> rows=new ArrayList<>();for(var p:products()) {
            Map<String,Object> row=new LinkedHashMap<>();row.put("sku",p.sku());row.put("group",p.scenario());row.put("replica",p.replica());
            row.put("ownPriceElasticity",beta(p));row.put("basePrice",p.basePrice());row.put("trueUnitCost",trueCost(p));row.put("recordedUnitCost",p.baseCost());
            row.put("referenceUnits",referenceUnits(p));row.put("evidence",evidence(p));rows.add(row);
        }
        return Map.of("generatorVersion",VERSION,"seed",SEED,"synthetic",true,"logNoiseSd",.06,"priceAssignment","independent weekly tiers; last56days reference; seasonal exception",
                "causalValidation","NOT_ESTABLISHED","scenarios",rows);
    }
    private BigDecimal money(double value) { return BigDecimal.valueOf(value).setScale(4,RoundingMode.UNNECESSARY); }
}
