package com.smartpricing.onboarding;

import java.math.BigDecimal;
import java.time.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class ReadinessRulesTest {
    @Test void workflowNeverTreatsConnectionOrImportAsModelEligibility(){
        assertThat(ReadinessRules.workflow(false,false,null,0,false)).isEqualTo("NOT_CONNECTED");
        assertThat(ReadinessRules.workflow(false,true,null,0,false)).isEqualTo("CONNECTED_NOT_SYNCED");
        assertThat(ReadinessRules.workflow(false,true,"RUNNING",0,false)).isEqualTo("SYNC_RUNNING");
        assertThat(ReadinessRules.workflow(false,true,"PARTIAL",10,false)).isEqualTo("SYNC_FAILED");
        assertThat(ReadinessRules.workflow(false,true,"SUCCEEDED",10,true)).isEqualTo("SYNC_COMPLETED_NEEDS_REVIEW");
        assertThat(ReadinessRules.workflow(false,true,"SUCCEEDED",10,false)).isEqualTo("READY_FOR_ANALYTICS");
        assertThat(ReadinessRules.workflow(true,false,null,10,false)).isEqualTo("SYNTHETIC_DEMO");
    }
    @Test void stockSeparatesUnknownZeroStaleAndAvailable(){
        Instant now=Instant.parse("2026-11-12T10:00:00Z");
        assertThat(ReadinessRules.stock(null,null,null,now,24).status()).isEqualTo(ReadinessDtos.State.UNKNOWN);
        assertThat(ReadinessRules.stock(0,now,"SNAPSHOT",now,24).code()).isEqualTo("CURRENT_STOCKOUT");
        assertThat(ReadinessRules.stock(2,now.minus(Duration.ofHours(25)),"SNAPSHOT",now,24).status()).isEqualTo(ReadinessDtos.State.STALE);
        assertThat(ReadinessRules.stock(2,now,"INFERRED",now,24).status()).isEqualTo(ReadinessDtos.State.UNKNOWN);
        assertThat(ReadinessRules.stock(2,now,"SNAPSHOT",now,24).status()).isEqualTo(ReadinessDtos.State.AVAILABLE);
    }
    @Test void constraintsExposeConflictsAndFrozenQuotesWithoutRelaxingGates(){
        assertThat(ReadinessRules.constraints(new BigDecimal("10"),null,new BigDecimal("10"),new BigDecimal("10")).code()).isEqualTo("FIXED_PRICE_BOUNDS");
        assertThat(ReadinessRules.constraints(new BigDecimal("10"),new BigDecimal("20"),new BigDecimal("5"),new BigDecimal("15")).code()).isEqualTo("COST_AT_OR_ABOVE_MAXIMUM");
        assertThat(ReadinessRules.constraints(new BigDecimal("10"),null,new BigDecimal("15"),new BigDecimal("5")).status()).isEqualTo(ReadinessDtos.State.CONFLICTING);
        assertThat(ReadinessRules.constraints(new BigDecimal("10"),new BigDecimal("4"),new BigDecimal("5"),new BigDecimal("15")).status()).isEqualTo(ReadinessDtos.State.AVAILABLE);
    }
}
