package com.smartpricing.research;

import java.math.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class DecisionSupportResearchTest {
    record Costs(BigDecimal variable,BigDecimal shipping,BigDecimal fixedFee,BigDecimal feeRate,BigDecimal taxRate,BigDecimal fixedOverhead) {}
    static BigDecimal contribution(BigDecimal gross,Costs c) {
        if(gross==null||c==null||c.variable()==null||c.shipping()==null||c.fixedFee()==null||c.feeRate()==null||c.taxRate()==null)return null;
        if(gross.signum()<=0||c.variable().signum()<0||c.shipping().signum()<0||c.fixedFee().signum()<0||c.feeRate().signum()<0||c.feeRate().compareTo(BigDecimal.ONE)>=0||c.taxRate().signum()<0)throw new IllegalArgumentException("Invalid assumptions");
        return gross.divide(BigDecimal.ONE.add(c.taxRate()),12,RoundingMode.HALF_UP).subtract(c.variable()).subtract(c.shipping()).subtract(c.fixedFee()).subtract(gross.multiply(c.feeRate()));
    }
    static BigDecimal targetGross(Costs c,BigDecimal targetMargin) {
        if(contribution(BigDecimal.ONE,c)==null||targetMargin==null)return null;
        BigDecimal denominator=BigDecimal.ONE.subtract(targetMargin).divide(BigDecimal.ONE.add(c.taxRate()),12,RoundingMode.HALF_UP).subtract(c.feeRate());
        if(targetMargin.signum()<0||targetMargin.compareTo(BigDecimal.ONE)>=0||denominator.signum()<=0)throw new IllegalArgumentException("Unattainable target");
        return c.variable().add(c.shipping()).add(c.fixedFee()).divide(denominator,12,RoundingMode.HALF_UP);
    }
    static BigDecimal breakEven(BigDecimal contribution,BigDecimal overhead) { return contribution==null||overhead==null?null:contribution.signum()<=0||overhead.signum()<0?null:overhead.divide(contribution,0,RoundingMode.CEILING); }
    @Test void knownComponentsUseDecimalArithmeticAndDoNotClaimFullNetProfit() {
        var c=new Costs(new BigDecimal("40"),new BigDecimal("5"),BigDecimal.ONE,new BigDecimal(".02"),new BigDecimal(".20"),new BigDecimal("1000"));
        assertThat(contribution(new BigDecimal("120"),c)).isEqualByComparingTo("51.6");
        assertThat(breakEven(contribution(new BigDecimal("120"),c),c.fixedOverhead())).isEqualByComparingTo("20");
        assertThat(targetGross(c,new BigDecimal(".4"))).isEqualByComparingTo("95.833333333333");
    }
    @Test void missingOrInvalidInputsCannotBecomeZeroCostOrAnInventedAnswer() {
        var unknown=new Costs(null,BigDecimal.ZERO,BigDecimal.ZERO,BigDecimal.ZERO,BigDecimal.ZERO,null);
        assertThat(contribution(BigDecimal.TEN,unknown)).isNull();assertThat(targetGross(unknown,new BigDecimal(".3"))).isNull();assertThat(breakEven(null,BigDecimal.TEN)).isNull();
        assertThat(breakEven(BigDecimal.ZERO,BigDecimal.TEN)).isNull();assertThat(breakEven(BigDecimal.ONE,null)).isNull();
        assertThatThrownBy(()->contribution(BigDecimal.ZERO,new Costs(BigDecimal.ONE,BigDecimal.ZERO,BigDecimal.ZERO,BigDecimal.ZERO,BigDecimal.ZERO,BigDecimal.ZERO))).isInstanceOf(IllegalArgumentException.class);
    }
}
