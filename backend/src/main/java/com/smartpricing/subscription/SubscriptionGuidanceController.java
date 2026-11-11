package com.smartpricing.subscription;

import com.smartpricing.common.ApiException;
import com.smartpricing.guidance.GuidanceCalculator;
import com.smartpricing.guidance.GuidanceCalculator.*;
import java.time.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.*;

@RestController
@RequestMapping("/api/v1/saas/plans")
@Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
public class SubscriptionGuidanceController {
    private final SubscriptionService subscriptions;private final BusinessMode mode;
    public SubscriptionGuidanceController(SubscriptionService subscriptions,BusinessMode mode){this.subscriptions=subscriptions;this.mode=mode;}
    @GetMapping("/{planId}/guidance")
    public Result guidance(@PathVariable String planId,@RequestParam String priceId,@RequestParam LocalDate asOf,@ModelAttribute SubscriptionInput inputs,jakarta.servlet.http.HttpServletRequest request){
        mode.requireSaas();
        com.smartpricing.guidance.GuidanceParameters.verify(request.getParameterMap(),SubscriptionInput.class,java.util.Set.of("priceId","asOf"));
        if(!planId.matches("[A-Za-z0-9_-]{1,64}")||!priceId.matches("[A-Za-z0-9_-]{1,64}"))throw ApiException.invalid("Use an existing opaque plan and price version.");
        if(asOf.isBefore(LocalDate.of(2000,1,1))||asOf.isAfter(LocalDate.now(ZoneOffset.UTC)))throw ApiException.invalid("Choose a recorded date from 2000 through today.");
        var price=subscriptions.prices().stream().filter(p->p.id().equals(priceId)&&p.planId().equals(planId)&&!p.effectiveDate().isAfter(asOf)).findFirst().orElseThrow(()->ApiException.missing("Effective price in this plan"));
        return GuidanceCalculator.subscription(planId,price.currency(),price.interval(),asOf.toString(),price.amount(),inputs);
    }
}
