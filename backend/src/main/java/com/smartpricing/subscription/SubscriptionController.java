package com.smartpricing.subscription;

import com.smartpricing.subscription.SubscriptionService.*;
import java.time.LocalDate;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/saas")
public class SubscriptionController {
    private final SubscriptionService service;
    public SubscriptionController(SubscriptionService service) {this.service=service;}
    @GetMapping("/metrics") public Metrics metrics(@RequestParam LocalDate start,@RequestParam LocalDate asOf) {return service.metrics(start,asOf);}
    @GetMapping("/plans") public Page<Plan> plans(@RequestParam(defaultValue="") String search,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="10") int size,@RequestParam(defaultValue="name") String sort,@RequestParam LocalDate asOf) {return service.plans(search,page,size,sort,asOf);}
    @GetMapping("/subscriptions") public Page<Subscriber> subscriptions(@RequestParam(defaultValue="") String search,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="10") int size,@RequestParam LocalDate asOf) {return service.subscribers(search,page,size,asOf);}
    @GetMapping("/plans/{id}/history") public PlanHistory history(@PathVariable String id,@RequestParam LocalDate start,@RequestParam LocalDate asOf) {return service.planHistory(id,start,asOf);}
    @PostMapping("/entry/preview") public Receipt preview(@RequestBody Operation operation) {return service.ingest(operation,false);}
    @PostMapping("/entry/commit") public Receipt commit(@RequestBody Operation operation) {return service.ingest(operation,true);}
}
