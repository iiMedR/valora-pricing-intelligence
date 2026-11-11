package com.smartpricing.research;

import com.smartpricing.forecasting.dto.ForecastDtos.*;
import com.smartpricing.forecasting.service.*;
import com.smartpricing.optimization.repository.OptimizationRepository.Market;
import com.smartpricing.optimization.service.*;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class LowDataBenchmarkTest {
    // Freeze HTTP-support classification to this audit date; future reruns must not relabel fixtures.
    static final LocalDate BENCHMARK_AS_OF=LocalDate.of(2026,11,13);
    static final DemandModel MODEL=new DemandModel(ForecastSettings.defaults());
    static final OptimizationService BASELINE=new OptimizationService(null,MODEL,null,new ContributionOptimizer(),OptimizationSettings.defaults());
    static Path output() {return Path.of(System.getProperty("pricing.research.output","target/pricing-research"));}
    static String csv(Object... values) {return Arrays.stream(values).map(v->v==null?"":'"'+v.toString().replace("\"","\"\"")+'"').reduce((a,b)->a+","+b).orElse("")+"\n";}
    static void save(String file,String value)throws Exception {Files.createDirectories(output());Files.writeString(output().resolve(file),value,StandardCharsets.UTF_8);}
    static Double finite(double value){return Double.isFinite(value)?value:null;}
    static double oracle(ResearchFixtures.Truth truth,double low,double high) {double best=low;for(int tick=(int)Math.round(low*100);tick<=Math.round(high*100);tick++){double price=tick/100d;if(truth.contribution(price)>truth.contribution(best))best=price;}return best;}
    static long transitions(List<Day> rows) {String prior=null;long count=0;for(Day d:rows)if(d.effectivePrice()!=null){if(prior!=null&&!prior.equals(d.effectivePrice()))count++;prior=d.effectivePrice();}return count;}
    @Test void reproducibleCountFixturesHaveNegativeControlsAndNoTruthInObservationViews() {
        var a=ResearchFixtures.generate(ResearchFixtures.Kind.KNOWN_OPTIMUM,1001); var b=ResearchFixtures.generate(ResearchFixtures.Kind.KNOWN_OPTIMUM,1001);
        assertThat(a.hash()).isEqualTo(b.hash());assertThat(ResearchFixtures.generate(a.kind(),1002).hash()).isNotEqualTo(a.hash());
        assertThat(a.observations()).allSatisfy(d->assertThat(d.priceSource()).doesNotContain("truth","elasticity"));
        assertThat(oracle(a.truth(),50,150)).isEqualTo(80);assertThat(oracle(a.truth(),90,110)).isEqualTo(90);
        assertThat(MODEL.analyze(ResearchFixtures.generate(ResearchFixtures.Kind.LARGE_CONSTANT,1001).observations()).elasticity().estimate()).isNull();
        assertThat(MODEL.analyze(ResearchFixtures.generate(ResearchFixtures.Kind.N5_THREE,1001).observations()).elasticity().estimate()).isNull();
    }
    @Test void priorsRemainPriorsWhenPricesContainNoWithinStratumInformation() {
        var rows=ResearchFixtures.generate(ResearchFixtures.Kind.N50_CONSTANT,1001).observations();
        var e=ResearchEstimators.posterior(rows,-1.5,2);assertThat(e.mean()).isEqualTo(-1.5);assertThat(e.sd()).isEqualTo(2);assertThat(e.priorShare()).isEqualTo(1);assertThat(e.high()).isGreaterThan(0);
        var optimistic=ResearchEstimators.posterior(rows,-.5,.5);assertThat(optimistic.mean()).isEqualTo(-.5);
    }
    @Test void donorOnlyPoolingCanTransferTheWrongResponse() {
        var target=ResearchFixtures.generate(ResearchFixtures.Kind.HETEROGENEOUS_POOL,1001);
        List<List<Day>> donors=new ArrayList<>();for(int i=0;i<4;i++)donors.add(ResearchFixtures.donor(101001+i,-3).observations());
        var pooled=ResearchEstimators.pooled(target.observations(),donors);
        assertThat(Math.abs(pooled.mean()-target.truth().localElasticity())).isGreaterThan(1);
        assertThat(pooled.high()).isLessThan(0); // Negative sign does NOT make pooling identified/authoritative.
    }
    @Test void runPreregisteredReplicatesWithoutChangingProductionPolicy()throws Exception {
        long started=System.nanoTime();
        StringBuilder trials=new StringBuilder("split,scenario,seed,fixtureHash,nominalN,days,observedN,fitN,priceLevels,priceTransitions,httpWindowSupported,syntheticTarget,targetMeaning,shouldAbstain,method,estimate,low,high,priorShare,intervalLabel,componentStatus,policyActionable,falseActionable,blockers,researchPluginPrice,productionPrice,oraclePrice,regretPercent,signConfidentNegative\n");
        StringBuilder hashes=new StringBuilder("split,scenario,seed,sha256\n"),timing=new StringBuilder("split,scenario,seed,method,nanos\n");
        int cases=0,rows=0;
        for(String split:List.of("DEV","TEST"))for(long seed:split.equals("DEV")?ResearchFixtures.DEV:ResearchFixtures.TEST)for(var kind:ResearchFixtures.Kind.values()) {
            var fixture=ResearchFixtures.generate(kind,seed);var days=fixture.observations();var truth=fixture.truth();
            LocalDate start=days.getFirst().date(),end=days.getLast().date().plusDays(1);Instant at=end.atStartOfDay(ZoneOffset.UTC).toInstant().minusNanos(1000);
            var id=new Identity(UUID.nameUUIDFromBytes((kind+"/"+seed).getBytes(StandardCharsets.UTF_8)),UUID.fromString("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),"Research only","Synthetic",kind.name(),"ACTIVE","ACTIVE");
            var market=new Market(new BigDecimal("50"),new BigDecimal("150"),new BigDecimal("100"),kind==ResearchFixtures.Kind.REFUNDS_MISSING_COST?null:new BigDecimal("40"),at.minus(Duration.ofDays(1)),at.minus(Duration.ofDays(1)),1000000,at.minus(Duration.ofHours(1)),"SNAPSHOT");
            long before=System.nanoTime();var evaluation=BASELINE.evaluate(new ForecastService.Input(id,new Window(start,end,"UTC","MAD"),days),market,30);long nanos=System.nanoTime()-before;
            boolean api=days.size()<=731&&!end.isAfter(BENCHMARK_AS_OF.plusDays(1));
            boolean actionable=api&&evaluation.status().name().equals("ACTIONABLE");var readiness=evaluation.elasticity().readiness();
            if(evaluation.status().name().equals("ACTIONABLE"))assertThat(evaluation.comparison()).isNotNull();else{assertThat(evaluation.recommendedPrice()).isNull();assertThat(evaluation.comparison()).isNull();assertThat(evaluation.sensitivity()).isEmpty();}
            assertThat(evaluation.elasticity().confidenceLow()).isNull();assertThat(evaluation.elasticity().confidenceHigh()).isNull();
            long observed=days.stream().filter(d->!d.availability().equals("UNKNOWN")).count();long levels=days.stream().map(Day::effectivePrice).filter(Objects::nonNull).distinct().count();
            double optimal=oracle(truth,90,110);String blockers=String.join(";",evaluation.reasons());
            Double beta=evaluation.elasticity().estimate();double plugin=beta==null?Double.NaN:ResearchEstimators.plugin(beta);
            trials.append(row(split,fixture,observed,readiness.eligibleDays(),levels,api,"A_PRODUCTION",beta,null,null,null,"UNCERTAINTY_UNAVAILABLE",evaluation.status().name(),actionable,blockers,plugin,evaluation.recommendedPrice(),optimal,false));rows++;
            timing.append(csv(split,kind,seed,"A_PRODUCTION",nanos));hashes.append(csv(split,kind,seed,fixture.hash()));cases++;
            double[][] priors={{-1.5,2},{-.5,.5},{-3,.5}};String[] names={"D_WEAK","D_OPTIMISTIC","D_ELASTIC"};
            for(int i=0;i<3;i++) {
                before=System.nanoTime();var e=ResearchEstimators.posterior(days,priors[i][0],priors[i][1]);nanos=System.nanoTime()-before;
                trials.append(row(split,fixture,observed,readiness.eligibleDays(),levels,api,names[i],e.mean(),e.low(),e.high(),e.priorShare(),"CONDITIONAL_APPROXIMATE_NOT_CALIBRATED","RESEARCH_ONLY",false,"NO_AUTHORITY_FROM_PRIOR_OR_ASSOCIATION",ResearchEstimators.plugin(e.mean()),null,optimal,e.high()<0));rows++;
                timing.append(csv(split,kind,seed,names[i],nanos));
            }
            if(kind==ResearchFixtures.Kind.COMPARABLE_POOL||kind==ResearchFixtures.Kind.HETEROGENEOUS_POOL) {
                List<List<Day>> donors=new ArrayList<>();for(int i=0;i<4;i++)donors.add(ResearchFixtures.donor(seed+100000+i*1000,kind==ResearchFixtures.Kind.HETEROGENEOUS_POOL?-3:-2).observations());
                before=System.nanoTime();var e=ResearchEstimators.pooled(days,donors);nanos=System.nanoTime()-before;
                trials.append(row(split,fixture,observed,readiness.eligibleDays(),levels,api,"E_DONOR_POOL",e.mean(),e.low(),e.high(),e.priorShare(),"EMPIRICAL_POOLING_NOT_CALIBRATED","RESEARCH_ONLY",false,"COMPARABILITY_NOT_VALIDATED",ResearchEstimators.plugin(e.mean()),null,optimal,e.high()<0));rows++;
                timing.append(csv(split,kind,seed,"E_DONOR_POOL",nanos));
            }
        }
        save("trials.csv",trials.toString());save("fixture-hashes.csv",hashes.toString());save("timing.csv",timing.toString());
        save("run-metadata.txt","fixtureVersion="+ResearchFixtures.VERSION+"\ncases="+cases+"\nrows="+rows+"\nheldoutSeeds=1001..1012\njava="+System.getProperty("java.version")+"\nelapsedNanos="+(System.nanoTime()-started)+"\nproductionSourceUnchanged=true\n");
        System.out.println("RESEARCH_RUN cases="+cases+" rows="+rows+" output="+output().toAbsolutePath()+" elapsedSeconds="+(System.nanoTime()-started)/1e9);
        assertThat(cases).isEqualTo(ResearchFixtures.Kind.values().length*15);
    }
    private static String row(String split,ResearchFixtures.Fixture f,long observed,int fit,long levels,boolean api,String method,Double estimate,Double low,Double high,Double prior,String uncertainty,String status,boolean actionable,String blockers,double plugin,String productionPrice,double optimal,boolean negative) {
        Double regret=Double.isFinite(plugin)?Math.max(0,100*(f.truth().contribution(optimal)-f.truth().contribution(plugin))/f.truth().contribution(optimal)):null;
        return csv(split,f.kind(),f.seed(),f.hash(),f.nominalObservations(),f.observations().size(),observed,fit,levels,transitions(f.observations()),api,f.truth().localElasticity(),f.truth().target(),f.truth().shouldAbstain(),method,estimate,low,high,prior,uncertainty,status,actionable,actionable&&f.truth().shouldAbstain(),blockers,finite(plugin),productionPrice,optimal,regret,negative);
    }
    @Test void boundedExperimentSimulationAndAssumedScenariosNeverBecomeRecommendations()throws Exception {
        StringBuilder scenarios=new StringBuilder("label,assumedElasticity,price,assumedUnits,knownUnitCost,estimatedContributionExcludingOtherCosts\n");
        for(double beta:new double[]{-.25,-1,-2,-3})for(double price:new double[]{90,100,110}){double units=100*Math.pow(price/100,beta);scenarios.append(csv("USER_ASSUMPTION_NOT_FITTED",beta,price,units,40,(price-40)*units));}
        save("assumed-scenarios.csv",scenarios.toString());
        StringBuilder experiments=new StringBuilder("seed,days,assumedDailyUnits,trueSyntheticElasticity,randomizedPrices,conditionalIntervalWidth,posteriorPriorShare,syntheticExpectedContributionDifferenceVsHold100,label\n");
        for(long seed:ResearchFixtures.TEST)for(int n:new int[]{30,90,365})for(double level:new double[]{.7,200})for(double beta:new double[]{-.25,-2}) {
            Random r=new Random(seed+31*n+(int)(level*10)+(int)(beta*100));List<Day> days=new ArrayList<>();double difference=0;
            for(int i=0;i<n;i++){double p=r.nextBoolean()?95:105;long units=ResearchFixtures.poisson(r,level*Math.pow(p/100,beta));days.add(new Day(LocalDate.of(2023,1,1).plusDays(i),units,0,ResearchFixtures.amount(p),ResearchFixtures.amount(p),"RESEARCH_RANDOMIZATION","IN_STOCK",1000000,false,List.of()));difference+=(p-40)*level*Math.pow(p/100,beta)-60*level;}
            var estimate=ResearchEstimators.posterior(days,-1.5,2);experiments.append(csv(seed,n,level,beta,"95_OR_105",estimate.high()-estimate.low(),estimate.priorShare(),difference,"OFFLINE_FEASIBILITY_NOT_AUTHORIZED"));
        }
        save("experiment-simulation.csv",experiments.toString());
        var costs=new DecisionSupportResearchTest.Costs(new BigDecimal("40"),new BigDecimal("5"),BigDecimal.ONE,new BigDecimal(".02"),new BigDecimal(".2"),new BigDecimal("1000"));
        save("deterministic-calculators.csv","label,value\n"+csv("contribution_gross120_tax20pct_variable40_shipping5_fixedFee1_fee2pct",DecisionSupportResearchTest.contribution(new BigDecimal("120"),costs))+csv("breakEvenUnits_fixedOverhead1000",DecisionSupportResearchTest.breakEven(new BigDecimal("51.6"),costs.fixedOverhead()))+csv("grossPriceFor40pctContributionMargin",DecisionSupportResearchTest.targetGross(costs,new BigDecimal(".4")))+csv("unknownVariableCost","UNAVAILABLE"));
    }
}

