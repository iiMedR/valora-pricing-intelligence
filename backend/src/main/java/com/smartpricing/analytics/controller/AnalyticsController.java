package com.smartpricing.analytics.controller;

import com.smartpricing.analytics.dto.AnalyticsDtos.*;
import com.smartpricing.analytics.service.AnalyticsService;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/analytics")
public class AnalyticsController {
    private final AnalyticsService analytics;
    public AnalyticsController(AnalyticsService analytics) { this.analytics=analytics; }
    @GetMapping("/overview") public Overview overview(@RequestParam LocalDate startDate,@RequestParam LocalDate endDate) { return analytics.overview(startDate,endDate); }
    @GetMapping("/trends") public Trends trends(@RequestParam LocalDate startDate,@RequestParam LocalDate endDate,@RequestParam(defaultValue="DAY") Granularity granularity) { return analytics.trends(startDate,endDate,granularity); }
    @GetMapping("/products") public PerformancePage products(@RequestParam LocalDate startDate,@RequestParam LocalDate endDate,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size,@RequestParam(defaultValue="NET_DESC") Sort sort,@RequestParam(defaultValue="") String search) { return analytics.products(startDate,endDate,null,page,size,sort,search); }
    @GetMapping("/products/{productId}/variants") public PerformancePage variants(@PathVariable UUID productId,@RequestParam LocalDate startDate,@RequestParam LocalDate endDate,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size,@RequestParam(defaultValue="NET_DESC") Sort sort,@RequestParam(defaultValue="") String search) { return analytics.products(startDate,endDate,productId,page,size,sort,search); }
    @GetMapping("/inventory") public Inventory inventory(@RequestParam LocalDate startDate,@RequestParam LocalDate endDate,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size) { return analytics.inventory(startDate,endDate,page,size); }
}
