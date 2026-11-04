package com.smartpricing.forecasting.service;

import com.smartpricing.forecasting.dto.ForecastDtos.*;
import com.smartpricing.forecasting.repository.DemandRepository;
import com.smartpricing.analytics.repository.AnalyticsRepository;
import com.smartpricing.catalog.dto.CatalogDtos.PageView;
import com.smartpricing.common.ApiException;
import com.smartpricing.business.service.BusinessService;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
@EnableConfigurationProperties(ForecastSettings.class)
@Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
public class ForecastService {
    private final DemandRepository repository;private final DemandModel model;private final BusinessService business;private final AnalyticsRepository currencies;
    public ForecastService(DemandRepository repository,DemandModel model,BusinessService business,AnalyticsRepository currencies){this.repository=repository;this.model=model;this.business=business;this.currencies=currencies;}
    private Window window(LocalDate start,LocalDate end) {
        if(start==null||end==null||ChronoUnit.DAYS.between(start,end)<28||ChronoUnit.DAYS.between(start,end)>731||start.getYear()<1900||end.isAfter(LocalDate.now(ZoneOffset.UTC).plusDays(1)))throw ApiException.invalid("Use 28–731 increasing UTC days ending no later than tomorrow UTC.");
        String currency=business.get().currencyCode();currencies.currency(currencies.params(start,end),currency);return new Window(start,end,"UTC",currency);
    }
    private void horizon(int horizon){if(horizon!=7&&horizon!=14&&horizon!=30)throw ApiException.invalid("horizonDays must be 7, 14 or 30.");}
    public Overview overview(LocalDate start,LocalDate end,int page,int size,String search){
        if(page<0||page>100000||size<1||size>10||search.length()>100)throw ApiException.invalid("Page 0–100000, size 1–10 and search at most 100 characters are required.");
        var window=window(start,end);var identities=repository.page(page,size,search);var series=repository.series(identities.content().stream().map(Identity::variantId).toList(),start,end);
        var rows=identities.content().stream().map(v->new Summary(v,model.analyze(series.get(v.variantId())).readiness())).toList();
        return new Overview(window,new PageView<>(rows,page,size,identities.totalElements(),identities.totalPages()));
    }
    public Detail detail(UUID id,LocalDate start,LocalDate end,int horizon){horizon(horizon);var window=window(start,end);var identity=repository.identity(id);var days=repository.series(List.of(id),start,end).get(id);var analysis=model.analyze(days);
        return new Detail(identity,window,analysis.readiness(),analysis.elasticity(),model.forecast(days,end,horizon,!identity.status().equals("ACTIVE")||!identity.productStatus().equals("ACTIVE")),analysis.history());}
    public Backtest backtest(UUID id,LocalDate start,LocalDate end,int horizon){horizon(horizon);var window=window(start,end);var identity=repository.identity(id);return new Backtest(identity,window,horizon,"HELD_OUT_OBSERVED_SALES",model.backtest(repository.series(List.of(id),start,end).get(id),end,horizon));}
}
