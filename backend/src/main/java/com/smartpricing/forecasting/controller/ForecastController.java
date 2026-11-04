package com.smartpricing.forecasting.controller;

import com.smartpricing.forecasting.dto.ForecastDtos.*;
import com.smartpricing.forecasting.service.ForecastService;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/forecasting")
public class ForecastController {
    private final ForecastService service;public ForecastController(ForecastService service){this.service=service;}
    @GetMapping("/overview") public Overview overview(@RequestParam LocalDate startDate,@RequestParam LocalDate endDate,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="10") int size,@RequestParam(defaultValue="") String search){return service.overview(startDate,endDate,page,size,search);}
    @GetMapping("/variants/{id}/readiness") public Readiness readiness(@PathVariable UUID id,@RequestParam LocalDate startDate,@RequestParam LocalDate endDate){return service.detail(id,startDate,endDate,7).readiness();}
    @GetMapping("/variants/{id}/elasticity") public Elasticity elasticity(@PathVariable UUID id,@RequestParam LocalDate startDate,@RequestParam LocalDate endDate){return service.detail(id,startDate,endDate,7).elasticity();}
    @GetMapping("/variants/{id}/demand") public Detail demand(@PathVariable UUID id,@RequestParam LocalDate startDate,@RequestParam LocalDate endDate,@RequestParam(defaultValue="7") int horizonDays){return service.detail(id,startDate,endDate,horizonDays);}
    @GetMapping("/variants/{id}/backtest") public Backtest backtest(@PathVariable UUID id,@RequestParam LocalDate startDate,@RequestParam LocalDate endDate,@RequestParam(defaultValue="7") int horizonDays){return service.backtest(id,startDate,endDate,horizonDays);}
}
