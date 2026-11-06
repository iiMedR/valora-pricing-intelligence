package com.smartpricing.onboarding;

import static com.smartpricing.onboarding.ReadinessDtos.*;
import static com.smartpricing.onboarding.ReadinessRules.finding;
import com.smartpricing.catalog.dto.CatalogDtos.PageView;
import com.smartpricing.common.ApiException;
import com.smartpricing.demo.config.DemoSafetyGuard;
import com.smartpricing.forecasting.dto.ForecastDtos;
import com.smartpricing.forecasting.repository.DemandRepository;
import com.smartpricing.forecasting.service.ForecastService;
import com.smartpricing.optimization.repository.OptimizationRepository;
import com.smartpricing.optimization.service.*;
import com.smartpricing.shopify.ShopifyService;
import com.smartpricing.shopify.sync.SyncCoordinator;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service
@Transactional(readOnly=true,isolation=Isolation.REPEATABLE_READ)
public class ReadinessService {
    private final ReadinessRepository repository;private final DemandRepository demand;private final OptimizationRepository markets;private final OptimizationService optimization;private final OptimizationSettings settings;private final SyncCoordinator sync;private final ShopifyService connections;private final DemoSafetyGuard guard;private final JdbcTemplate jdbc;private final Clock clock;
    public ReadinessService(ReadinessRepository repository,DemandRepository demand,OptimizationRepository markets,OptimizationService optimization,OptimizationSettings settings,SyncCoordinator sync,ShopifyService connections,DemoSafetyGuard guard,JdbcTemplate jdbc,Clock clock){this.repository=repository;this.demand=demand;this.markets=markets;this.optimization=optimization;this.settings=settings;this.sync=sync;this.connections=connections;this.guard=guard;this.jdbc=jdbc;this.clock=clock;}
    private record Context(Window window,boolean demo,String shop,String scope,SyncCoordinator.Status sync){}
    private Context context(LocalDate start,LocalDate end){
        boolean demo=guard.demoRequested();if(demo)guard.requireDemo();
        if(end==null){end=LocalDate.now(clock.withZone(ZoneOffset.UTC));if(demo){var dates=jdbc.queryForList("SELECT reference_start FROM demo_control.seed_runs WHERE id=1",java.sql.Date.class);if(!dates.isEmpty())end=dates.getFirst().toLocalDate().plusMonths(12);}}
        if(start==null)start=end.minusDays(365);
        long days=ChronoUnit.DAYS.between(start,end);if(days<28||days>731||start.getYear()<1900||end.isAfter(LocalDate.now(clock.withZone(ZoneOffset.UTC)).plusDays(1)))throw ApiException.invalid("Use 28–731 increasing UTC days, ending no later than tomorrow UTC.");
        String currency=jdbc.queryForObject("SELECT currency_code FROM business_settings WHERE id=1",String.class);
        var synchronization=sync.status();String shop=demo?null:synchronization.shop();
        return new Context(new Window(start,end,end.atStartOfDay(ZoneOffset.UTC).toInstant().minusNanos(1000),clock.instant(),currency),demo,shop,demo?"SYNTHETIC_DATA":shop==null?"INSTALLATION_HISTORY":"CURRENT_SHOP_AND_UNMAPPED_MANUAL",synchronization);
    }
    public Variants variants(LocalDate start,LocalDate end,int page,int size,String search,String status){
        if(page<0||page>100000||size<1||size>10||search==null||search.length()>100||status==null)throw ApiException.invalid("Use page 0–100000, size 1–10 and search up to 100 characters.");
        var c=context(start,end);var rows=repository.page(c.shop(),c.window().assessedAt(),page,size,search,status);
        return new Variants(c.window(),c.demo(),c.scope(),status,new PageView<>(assess(c,rows.content()),page,size,rows.totalElements(),rows.totalPages()));
    }
    public Detail detail(UUID id,LocalDate start,LocalDate end){var c=context(start,end);var row=repository.row(c.shop(),c.window().assessedAt(),id);return new Detail(c.window(),c.demo(),c.scope(),assess(c,List.of(row)).getFirst());}
    private List<Variant> assess(Context c,List<ReadinessRepository.Row> rows){
        var w=c.window();var ids=rows.stream().map(r->r.identity().variantId()).toList();
        var series=demand.series(ids,w.startDate(),w.endDate());var historical=markets.inputs(ids,w.modelAsOf(),w.currencyCode());var current=markets.inputs(ids,w.assessedAt(),w.currencyCode());var coverage=repository.coverage(ids,w.startDate(),w.endDate());
        List<Variant> output=new ArrayList<>();
        for(var row:rows){
            UUID id=row.identity().variantId();var evidence=coverage.get(id);var market=current.get(id);
            var evaluation=optimization.evaluate(new ForecastService.Input(row.identity(),new ForecastDtos.Window(w.startDate(),w.endDate(),"UTC",w.currencyCode()),series.get(id)),historical.get(id),7);
            var diagnostics=evaluation.elasticity().readiness();Map<String,Finding> dimensions=new LinkedHashMap<>();
            String source=c.demo()?"DEMO":row.mappedShop()==null?"MANUAL_UNMAPPED":"SHOPIFY";
            dimensions.put("mapping",row.conflict()?finding(State.CONFLICTING,"LOCAL_EDIT_CONFLICT","Local edits are retained; later imports stop rather than overwrite them.",source):finding(row.mappedShop()==null&&!c.demo()?State.UNKNOWN:State.AVAILABLE,row.mappedShop()==null&&!c.demo()?"MANUAL_UNMAPPED":"SOURCE_IDENTIFIED","Source identity is separate from SKU matching; manual records are not silently linked.",source));
            dimensions.put("sku",row.mappedShop()!=null&&(row.providerSku()==null||row.providerSku().isBlank())?finding(State.MISSING,"PROVIDER_SKU_MISSING","The source SKU is missing; stable provider IDs and a generated local SKU still identify the variant.",source):finding(State.AVAILABLE,"LOCAL_SKU_PRESENT","A canonical SKU is present; it is not a cross-store identity key.",source));
            dimensions.put("current_price",row.price()==null||row.price().signum()<=0?finding(State.MISSING,"CURRENT_PRICE_UNAVAILABLE","No positive current quote is available.",source):finding(State.AVAILABLE,"CURRENT_QUOTE_ONLY","A current catalog quote does not prove historical listed prices.",source));
            dimensions.put("current_cost",row.cost()==null?finding(State.MISSING,"CURRENT_COST_UNKNOWN","Enter a known variable unit cost; unknown cost is never zero.","UNKNOWN"):row.costAt()==null?finding(State.UNKNOWN,"COST_TIMESTAMP_UNKNOWN","The catalog cost is known but has no dated cost evidence.","CATALOG_ONLY"):row.costAt().isBefore(w.assessedAt().minus(Duration.ofDays(settings.maxCostAgeDays())))?finding(State.STALE,"CURRENT_COST_STALE","Review the dated cost; it exceeds the current freshness policy.",row.costSource()):finding(State.AVAILABLE,"CURRENT_COST_RECORDED","Known dated cost is present; historical sale costs remain immutable.",row.costSource()));
            if(row.cost()!=null&&row.costEvidence()!=null&&row.cost().compareTo(row.costEvidence())!=0)dimensions.put("current_cost",finding(State.CONFLICTING,"CATALOG_COST_HISTORY_MISMATCH","The catalog cost differs from the latest dated cost evidence; review both without rewriting historical sales.","CATALOG_UNRECONCILED"));
            if(market!=null&&market.price()!=null&&row.price()!=null&&market.price().compareTo(row.price())!=0)dimensions.put("current_price",finding(State.CONFLICTING,"CATALOG_PRICE_HISTORY_MISMATCH","The current quote differs from the effective listed-price period; review the dated evidence.","CATALOG_UNRECONCILED"));
            dimensions.put("effective_price",effective(market==null?null:market.price(),market==null?null:market.priceFrom(),w.assessedAt(),settings.maxPriceAgeDays(),"PRICE"));
            dimensions.put("effective_cost",effective(market==null?null:market.cost(),market==null?null:market.costFrom(),w.assessedAt(),settings.maxCostAgeDays(),"COST"));
            dimensions.put("constraints",ReadinessRules.constraints(row.price(),row.cost(),row.min(),row.max()));
            dimensions.put("inventory",ReadinessRules.stock(row.stock(),row.stockAt(),row.stockQuality(),w.assessedAt(),settings.maxStockAgeHours()));
            var stockFinding=dimensions.get("inventory");dimensions.put("inventory",new Finding(stockFinding.status(),stockFinding.code(),stockFinding.message(),row.stockSource()==null?"UNKNOWN":row.stockSource()+":"+row.stockQuality()));
            if(row.conflict()&&dimensions.get("current_price").status()==State.AVAILABLE){var quote=dimensions.get("current_price");dimensions.put("current_price",new Finding(quote.status(),quote.code(),quote.message(),"LOCAL_EDITS_UNRECONCILED"));}
            dimensions.put("sales",evidence.lines()==0?finding(State.MISSING,"NO_COMPLETED_SALES","No completed sale lines exist in the selected window.",source):finding(State.AVAILABLE,"OBSERVED_SALES_PRESENT","Recorded sale days are observations, not proof that missing days were observed zero demand.",source));
            dimensions.put("cost_coverage",evidence.lines()==0?finding(State.UNKNOWN,"HISTORICAL_COST_COVERAGE_UNKNOWN","No completed sale lines are available for cost-coverage assessment.","UNKNOWN"):evidence.knownCostLines()<evidence.lines()?finding(State.INSUFFICIENT,"HISTORICAL_COSTS_INCOMPLETE","Some sale snapshots have unknown costs; current edits cannot rewrite them.","IMMUTABLE_SNAPSHOTS"):finding(State.AVAILABLE,"HISTORICAL_COSTS_RECORDED","All observed completed sale lines have a known cost snapshot; this is not full financial reconciliation.","IMMUTABLE_SNAPSHOTS"));
            dimensions.put("history",finding(diagnostics.status().equals("INSUFFICIENT_DATA")?State.INSUFFICIENT:State.AVAILABLE,"MODEL_HISTORY_DIAGNOSTICS","Eligible, unknown, censored and price-variation counts come from the existing demand model.","PERSISTED_HISTORY"));
            boolean activity=evidence.lines()>0||evidence.merchandiseRefunds()>0;
            Finding analytics=finding(activity?State.AVAILABLE:State.MISSING,activity?"ANALYTICS_OBSERVABLE":"ANALYTICS_NO_ACTIVITY",activity?"Observed sales/refund analytics are available; review cost and coverage limitations separately.":"Import or record transactions before interpreting sales analytics.",source);
            boolean forecast=evaluation.forecast().totalUnits()!=null;
            Finding forecasting=finding(forecast?State.AVAILABLE:State.INSUFFICIENT,forecast?"FORECAST_EVALUABLE":"FORECAST_ABSTAINS","This is the unchanged observed-sales forecast diagnostic, not evidence of causal price response.","EXISTING_FORECAST_GATES");
            Finding eligibility=finding(evaluation.status()==com.smartpricing.optimization.dto.OptimizationDtos.Status.ACTIONABLE?State.AVAILABLE:State.INSUFFICIENT,evaluation.status()==com.smartpricing.optimization.dto.OptimizationDtos.Status.ACTIONABLE?"EXISTING_GATES_ACTIONABLE":"OPTIMIZATION_ABSTAINS","Only the existing optimizer decides eligibility. No recommendation is applied and no gate is bypassed.","EXISTING_OPTIMIZATION_GATES");
            String product="/products/"+row.identity().productId(),history=product+"/variants/"+id+"/history";
            output.add(new Variant(row.identity(),new Inputs(decimal(row.price()),decimal(row.cost()),decimal(row.min()),decimal(row.max()),row.stock(),row.stockAt(),dimensions.get("current_cost").provenance(),row.costAt(),source,row.providerSku(),row.conflict()),evidence,Collections.unmodifiableMap(dimensions),analytics,forecasting,eligibility,evaluation.forecast().status(),evaluation.status().name(),diagnostics,evaluation.forecast().reasons(),evaluation.reasons(),product,history));
        }
        return List.copyOf(output);
    }
    private Finding effective(java.math.BigDecimal amount,Instant at,Instant now,int age,String type){return amount==null?finding(State.MISSING,"EFFECTIVE_"+type+"_MISSING","A current quote/snapshot is not a verified effective period. Use the dated history flow when authoritative evidence exists.","VERIFIED_HISTORY_REQUIRED"):finding(at==null||at.isBefore(now.minus(Duration.ofDays(age)))?State.STALE:State.AVAILABLE,"EFFECTIVE_"+type+"_"+(at==null||at.isBefore(now.minus(Duration.ofDays(age)))?"STALE":"AVAILABLE"),"Effective history uses the existing model freshness policy.","VERIFIED_CHANGE");}
    private String decimal(java.math.BigDecimal value){return value==null?null:value.toPlainString();}
    public Summary summary(LocalDate start,LocalDate end){
        var c=context(start,end);var counts=repository.counts(c.shop(),c.window().assessedAt(),c.window().startDate(),c.window().endDate());var job=c.sync().latest();
        boolean review=counts.get("local_conflicts")>0||(job!=null&&job.warnings().stream().anyMatch(v->v.contains("REFUND")||v.contains("DEFERRED")||v.contains("EXCLUDED")));
        String state=ReadinessRules.workflow(c.demo(),c.sync().connected(),job==null?null:job.state(),counts.get("completed_lines")+counts.get("refund_events"),review);
        List<Check> checks=new ArrayList<>();
        if(!c.demo()&&!c.sync().connected())checks.add(new Check("CONNECT_STORE",1,"Configure and authorize the store. Imported history is retained on disconnect.","/store-connection"));
        if(!c.demo()&&(job==null||!job.state().equals("SUCCEEDED")))checks.add(new Check("IMPORT_OR_RESUME",2,"Use the existing bounded import/resume controls; success does not prove complete coverage.","/store-connection"));
        if(counts.get("local_conflicts")>0)checks.add(new Check("RECONCILE_LOCAL_EDITS",3,"Local edits are preserved. Resolve provider/local conflicts before resuming imports.","/onboarding?status=LOCAL_CONFLICT"));
        if(counts.get("missing_cost")>0)checks.add(new Check("COMPLETE_COSTS",4,"Review missing variable unit costs and record dated evidence; do not infer costs from prices.","/onboarding?status=MISSING_COST"));
        if(counts.get("unknown_stock")+counts.get("stale_or_uncertain_stock")>0)checks.add(new Check("REVIEW_INVENTORY",5,"Review unknown/stale stock; a current snapshot cannot reconstruct past availability.","/onboarding?status=STALE_INVENTORY"));
        if(counts.get("completed_lines")==0)checks.add(new Check("REVIEW_SALES_COVERAGE",6,"No completed sale lines in this window; missing history is not proof of zero demand.","/orders"));
        checks.add(new Check("CHECK_VARIANT_DIAGNOSTICS",7,"Inspect per-variant forecast and optimization reasons. Imported data does not imply actionable pricing.","/onboarding#variant-readiness"));
        if(c.demo())checks=checks.stream().filter(ch->!ch.code().equals("COMPLETE_COSTS")&&!ch.code().equals("RECONCILE_LOCAL_EDITS")).toList();
        return new Summary(c.window(),c.demo(),c.scope(),state,"Workflow state describes import/review progress only. It does not certify elasticity, complete history or optimization eligibility.",c.demo()?"DEMO_DISABLED":connections.status().status(),c.sync(),Collections.unmodifiableMap(counts),List.copyOf(checks),"LIVE_SHOPIFY_NOT_VERIFIED",List.of("READ_ONLY_ASSESSMENT_NO_IMPLICIT_SYNC","CURRENT_INPUT_FRESHNESS_IS_ASSESSED_NOW_MODEL_GATES_USE_SELECTED_WINDOW","MISSING_DAYS_NOT_ZERO_DEMAND","UNKNOWN_COST_NOT_ZERO","NO_CAUSAL_ELASTICITY_OR_CALIBRATED_INTERVAL","SUCCESSFUL_IMPORT_NOT_COMPLETE_RECONCILIATION","MODEL_ELIGIBILITY_IS_PER_VARIANT_NOT_A_CATALOG_WIDE_PROMISE"));
    }
}
