package com.smartpricing.optimization;

import com.smartpricing.optimization.service.ContributionOptimizer;
import com.smartpricing.optimization.service.ContributionOptimizer.Input;
import java.math.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class ContributionOptimizerTest {
    final ContributionOptimizer optimizer=new ContributionOptimizer();
    Input input(double e,String cost,String min,String max,String cap){return new Input(new BigDecimal("100"),new BigDecimal("100"),cost==null?null:new BigDecimal(cost),e,new BigDecimal(min),new BigDecimal(max),cap==null?null:new BigDecimal(cap));}
    @Test void analyticalOptimumAndExactKnownContribution(){var i=input(-2,"40","1","200",null);var best=optimizer.optimize(i);assertThat(best.price()).isEqualByComparingTo("80");assertThat(ContributionOptimizer.decimal(best.units())).isEqualTo("156.2500");assertThat(ContributionOptimizer.decimal(best.contribution())).isEqualTo("6250.0000");assertThat(optimizer.at(i,new BigDecimal("100")).contribution()).isEqualByComparingTo("6000");}
    @Test void boundaryAndNearMinusOneCases(){for(double e:new double[]{-.5,-1,-.999999,-1.000001})assertThat(optimizer.optimize(input(e,"40","50","200",null)).price()).as("e=%s",e).isEqualByComparingTo("200");assertThat(optimizer.optimize(input(-2,"40","90","200",null)).price()).isEqualByComparingTo("90");assertThat(optimizer.optimize(input(-2,"40","50","70",null)).price()).isEqualByComparingTo("70");}
    @Test void gridNeighborsMatchExhaustiveSmallIntervalsIncludingInventoryKink(){
        for(Input i:new Input[]{input(-2.3,"40","70.0000","71.0000",null),input(-2,"40","141.4000","141.4500","50"),input(-.7,"0","1.0000","1.0100",null)}){
            var best=optimizer.optimize(i);var oracle=optimizer.at(i,i.lower());
            for(BigDecimal p=i.lower();p.compareTo(i.upper())<=0;p=p.add(ContributionOptimizer.TICK)){var value=optimizer.at(i,p);if(value.contribution().compareTo(oracle.contribution())>0)oracle=value;}
            assertThat(best.price()).isEqualByComparingTo(oracle.price());assertThat(best.contribution()).isEqualByComparingTo(oracle.contribution());
        }
    }
    @Test void invalidBoundsUnknownCostAndNonfiniteOrOverflowRefuse(){for(Input i:new Input[]{input(-2,null,"1","200",null),input(-2,"-1","1","200",null),input(-2,"300","1","200",null),input(-2,"40","0","200",null),input(-2,"40","100","90",null),input(Double.NaN,"40","1","200",null),input(Double.POSITIVE_INFINITY,"40","1","200",null),input(.1,"40","1","200",null)})assertThatThrownBy(()->optimizer.optimize(i)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->optimizer.at(input(-2,"40","1","200",null),BigDecimal.ZERO)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->optimizer.optimize(new Input(new BigDecimal("100000000000000"),new BigDecimal("1E30"),BigDecimal.ZERO,-100,new BigDecimal(".0001"),new BigDecimal("10"),null))).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void equalCostBoundIsBreakEvenAndDeterministic(){var i=input(-2,"40","40","40",null);assertThat(optimizer.optimize(i).contribution()).isEqualByComparingTo("0");assertThat(optimizer.optimize(i)).isEqualTo(optimizer.optimize(i));assertThat(optimizer.optimize(input(-2,"0","1.00001","1.00019",null)).price()).isEqualByComparingTo("1.0001");}
}
