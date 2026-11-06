package com.smartpricing.onboarding;

import java.time.LocalDate;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/onboarding")
public class OnboardingController {
    private final ReadinessService service;
    public OnboardingController(ReadinessService service){this.service=service;}
    @GetMapping("/summary") public ReadinessDtos.Summary summary(@RequestParam(required=false)LocalDate startDate,@RequestParam(required=false)LocalDate endDate){return service.summary(startDate,endDate);}
    @GetMapping("/readiness/variants") public ReadinessDtos.Variants variants(@RequestParam(required=false)LocalDate startDate,@RequestParam(required=false)LocalDate endDate,@RequestParam(defaultValue="0")int page,@RequestParam(defaultValue="5")int size,@RequestParam(defaultValue="")String search,@RequestParam(defaultValue="ALL")String status){return service.variants(startDate,endDate,page,size,search,status);}
    @GetMapping("/readiness/variants/{id}") public ReadinessDtos.Detail detail(@PathVariable UUID id,@RequestParam(required=false)LocalDate startDate,@RequestParam(required=false)LocalDate endDate){return service.detail(id,startDate,endDate);}
}
