package com.smartpricing.shopify.sync;

import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/shopify/sync")
public class SyncController {
    private final SyncCoordinator service;
    public SyncController(SyncCoordinator service){this.service=service;}
    @PostMapping public ResponseEntity<SyncRepository.Job> start(@RequestBody SyncCoordinator.Start input){return ResponseEntity.accepted().body(service.start(input));}
    @GetMapping("/status") public SyncCoordinator.Status status(){return service.status();}
    @GetMapping("/jobs") public List<SyncRepository.Job> jobs(@RequestParam(defaultValue="0")int page,@RequestParam(defaultValue="20")int size){return service.jobs(page,size);}
    @GetMapping("/jobs/{id}") public Map<String,Object> job(@PathVariable UUID id){return service.job(id);}
}
