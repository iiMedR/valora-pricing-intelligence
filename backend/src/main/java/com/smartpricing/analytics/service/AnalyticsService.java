package com.smartpricing.analytics.service;

import com.smartpricing.analytics.dto.AnalyticsDtos.*;
import com.smartpricing.analytics.repository.AnalyticsRepository;
import com.smartpricing.business.service.BusinessService;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
@Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
public class AnalyticsService {
    private final AnalyticsRepository repository;
    private final BusinessService business;
    public AnalyticsService(AnalyticsRepository repository,BusinessService business) { this.repository=repository;this.business=business; }
    private Range range(LocalDate start,LocalDate end) {
        AnalyticsRules.range(start,end);
        String currency=business.get().currencyCode();
        repository.currency(repository.params(start,end),currency);
        return new Range(start,end,"UTC",currency);
    }
    public Overview overview(LocalDate start,LocalDate end) { return new Overview(range(start,end),repository.overview(repository.params(start,end))); }
    public Trends trends(LocalDate start,LocalDate end,Granularity granularity) {
        Range range=range(start,end);var actual=repository.trends(repository.params(start,end),granularity);
        List<Bucket> buckets=new ArrayList<>();
        for(LocalDate date=granularity==Granularity.DAY?start:start.withDayOfMonth(1);date.isBefore(end);date=granularity==Granularity.DAY?date.plusDays(1):date.plusMonths(1))
            buckets.add(new Bucket(date,actual.getOrDefault(date,AnalyticsRules.empty())));
        return new Trends(range,granularity,buckets);
    }
    public PerformancePage products(LocalDate start,LocalDate end,UUID product,int page,int size,Sort sort,String search) {
        AnalyticsRules.page(page,size,search);
        Range range=range(start,end);
        return new PerformancePage(range,repository.performance(repository.params(start,end),product,page,size,sort,search));
    }
    public Inventory inventory(LocalDate start,LocalDate end,int page,int size) {
        AnalyticsRules.page(page,size,"");Range range=range(start,end);
        return repository.inventory(range,repository.params(start,end),page,size);
    }
}
