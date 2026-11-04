package com.smartpricing.optimization.controller;

import com.smartpricing.optimization.dto.OptimizationDtos.*;
import com.smartpricing.optimization.service.OptimizationService;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/optimization")
public class OptimizationController {
    private final OptimizationService service;public OptimizationController(OptimizationService service){this.service=service;}
    @GetMapping("/overview")public Overview overview(@RequestParam(required=false)LocalDate startDate,@RequestParam(required=false)LocalDate endDate,@RequestParam(defaultValue="7")int horizonDays,@RequestParam(defaultValue="0")int page,@RequestParam(defaultValue="10")int size,@RequestParam(defaultValue="")String search){return service.overview(startDate,endDate,horizonDays,page,size,search);}
    @GetMapping({"/variants/{id}/recommendation","/variants/{id}/sensitivity"})public Evaluation recommendation(@PathVariable UUID id,@RequestParam(required=false)LocalDate startDate,@RequestParam(required=false)LocalDate endDate,@RequestParam(defaultValue="7")int horizonDays){return service.recommendation(id,startDate,endDate,horizonDays);}
}
