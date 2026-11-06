package com.smartpricing.optimization.controller;

import com.smartpricing.optimization.service.EvaluationAudit;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/optimization/variants/{id}/evaluations")
public class EvaluationAuditController {
    private final EvaluationAudit audit;
    public EvaluationAuditController(EvaluationAudit audit){this.audit=audit;}
    @PostMapping public EvaluationAudit.Snapshot save(@PathVariable UUID id,@RequestParam(required=false)LocalDate startDate,@RequestParam(required=false)LocalDate endDate,@RequestParam(defaultValue="7")int horizonDays){return audit.save(id,startDate,endDate,horizonDays);}
    @GetMapping public EvaluationAudit.History history(@PathVariable UUID id,@RequestParam(defaultValue="0")int page,@RequestParam(defaultValue="10")int size){return audit.history(id,page,size);}
}
