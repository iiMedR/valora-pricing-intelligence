package com.smartpricing.research;

import com.smartpricing.forecasting.dto.ForecastDtos.*;
import com.smartpricing.forecasting.service.*;
import java.time.*;
import java.util.*;

/** Evaluator truth stays outside the observable Day contract. No production dependency. */
final class EvidenceQualityFixtures {
    enum Kind { DISCRETE5,DISCRETE20,DISCRETE50,DISCRETE130,DISCRETE180,DISCRETE365,DISCRETE700,CONTINUOUS365,CONTINUOUS700,PLATEAU,NARROW,CALENDAR,PROMOTION,HIDDEN_MARKETING,COMPETITOR,HOLIDAY,SHIFT,STRUCTURAL,REGIMES,STOCKOUT,GAPS,MISSING_COST,WRONG_COST,REFUNDS,WEAK,STRONG,ZERO_RESPONSE,SPARSE,NOISY,FLAT,CONSTANT,EXPONENTIAL,COST20,COST60,BOUNDARY }
    record Fixture(Kind kind,long seed,List<Day> days,double beta,double trueCost,boolean missingCost,String label,String labelReason,boolean coherent,String hash) {
        double contribution(double price){return 30*(kind==Kind.SPARSE?.7:1000)*(kind==Kind.EXPONENTIAL?Math.exp(-2*(price-100)/100):Math.pow(price/100,beta))*(price-trueCost);}
        double lower(){return Math.max(90,days.stream().filter(d->d.effectivePrice()!=null).mapToDouble(d->Double.parseDouble(d.effectivePrice())).min().orElse(100));}
        double upper(){return Math.min(110,days.stream().filter(d->d.effectivePrice()!=null).mapToDouble(d->Double.parseDouble(d.effectivePrice())).max().orElse(100));}
        double oracle(){double best=lower();for(double p: new double[]{lower(),upper(),100,kind==Kind.EXPONENTIAL?trueCost+50:beta== -1?100:beta*trueCost/(beta+1)})if(p>=lower()&&p<=upper()&&contribution(p)>contribution(best))best=p;return best;}
    }
    static Fixture generate(Kind kind,long seed){
        int n=switch(kind){case DISCRETE5->5;case DISCRETE20->20;case DISCRETE50->50;case DISCRETE130->130;case DISCRETE180->180;case DISCRETE700,CONTINUOUS700->700;default->365;};
        // The twin must consume precisely the same random stream as DISCRETE365.
        long salt=(kind==Kind.HIDDEN_MARKETING?Kind.DISCRETE365:kind).ordinal();
        Random random=new Random(seed*6364136223846793005L+salt*1442695040888963407L);
        double beta=switch(kind){case HIDDEN_MARKETING,WEAK->-.25;case STRONG->-3;case ZERO_RESPONSE->0;case BOUNDARY->-90.1/40.1;case FLAT->-5.0/3;default->-2;};
        List<Day> days=new ArrayList<>();double correlatedNoise=0;
        for(int i=0;i<n;i++){
            LocalDate date=LocalDate.of(2023,1,1).plusDays(i);
            double p=new double[]{80,100,120}[random.nextInt(3)];
            if(kind==Kind.CONTINUOUS365||kind==Kind.CONTINUOUS700)p=80+40*random.nextDouble();
            if(kind==Kind.NARROW)p=new double[]{95,100,105}[random.nextInt(3)];
            if(kind==Kind.PLATEAU)p=new double[]{80,100,120}[(i/14)%3];
            if(kind==Kind.CALENDAR)p=i<n/3?80:i<2*n/3?100:120;
            if(kind==Kind.CONSTANT||(n>=130&&i>=n-56))p=100;
            double response=kind==Kind.HIDDEN_MARKETING?-2:kind==Kind.STRUCTURAL?(i<n/2?-3:-.3):kind==Kind.REGIMES?((i/60)%2==0?-3:-.3):beta;
            double weekday=date.getDayOfWeek().getValue()<3?1.4:date.getDayOfWeek().getValue()>=6?.7:1;
            double shock=1;
            if(kind==Kind.COMPETITOR&&p<100)shock=1.4;
            if(kind==Kind.HOLIDAY&&(i%90)<7)shock=2;
            if(kind==Kind.SHIFT&&i>n/2)shock=1.7;
            double noise=random.nextGaussian()*(kind==Kind.NOISY?.6:.03);
            if(kind==Kind.NOISY){correlatedNoise=.8*correlatedNoise+noise;noise=correlatedNoise;}
            double mean=(kind==Kind.SPARSE?.7:1000)*(kind==Kind.EXPONENTIAL?Math.exp(-2*(p-100)/100):Math.pow(p/100,response))*weekday*shock*Math.exp(noise);
            long units=ResearchFixtures.poisson(random,mean);boolean censored=kind==Kind.STOCKOUT&&i%3==0;
            if(censored)units=Math.min(units,40);
            String price=ResearchFixtures.amount(p),listed=kind==Kind.PROMOTION&&p<100?ResearchFixtures.amount(p/0.8):price;
            boolean gap=kind==Kind.GAPS&&i%3==0;
            days.add(new Day(date,gap?0:units,kind==Kind.REFUNDS?units/5:0,gap?null:listed,gap?null:price,"RESEARCH_EVIDENCE_V1",gap?"UNKNOWN":censored?"STOCKOUT":"IN_STOCK",gap?null:censored?40:1000000,censored,List.of()));
        }
        boolean unsafe=Set.of(Kind.CALENDAR,Kind.PROMOTION,Kind.HIDDEN_MARKETING,Kind.COMPETITOR,Kind.HOLIDAY,Kind.SHIFT,Kind.STRUCTURAL,Kind.REGIMES,Kind.STOCKOUT,Kind.GAPS,Kind.MISSING_COST,Kind.WRONG_COST,Kind.CONSTANT).contains(kind);
        boolean uncertain=n<130||Set.of(Kind.PLATEAU,Kind.REFUNDS,Kind.SPARSE,Kind.NOISY,Kind.EXPONENTIAL,Kind.FLAT).contains(kind);
        String label=unsafe?"UNSAFE":uncertain?"INDETERMINATE":"SAFE_ELIGIBLE";
        double cost=kind==Kind.WRONG_COST||kind==Kind.COST60?60:kind==Kind.COST20?20:kind==Kind.BOUNDARY?50:40;
        var provisional=new Fixture(kind,seed,List.copyOf(days),beta,cost,kind==Kind.MISSING_COST,label,unsafe?"AUDITED_IDENTIFICATION_OR_INPUT_FAILURE":uncertain?"INSUFFICIENT_OR_AMBIGUOUS_OPPORTUNITY":"AUDITED_EXOGENOUS_STABLE_OPPORTUNITY",!Set.of(Kind.STRUCTURAL,Kind.REGIMES,Kind.EXPONENTIAL).contains(kind),completeHash(days));
        if(label.equals("SAFE_ELIGIBLE")&&(provisional.contribution(provisional.oracle())-provisional.contribution(100)<Math.max(10,.01*provisional.contribution(100))))return new Fixture(kind,seed,provisional.days(),beta,cost,false,"INDETERMINATE","NEGLIGIBLE_GAIN",true,provisional.hash());
        return provisional;
    }
    static String completeHash(List<Day> days){try{var d=java.security.MessageDigest.getInstance("SHA-256");for(var row:days)d.update((row.toString()+"\n").getBytes(java.nio.charset.StandardCharsets.UTF_8));return HexFormat.of().formatHex(d.digest());}catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException(e);}}
    private EvidenceQualityFixtures(){}
}
