package com.smartpricing.demo.service;

import com.smartpricing.business.dto.BusinessDtos.Update;
import com.smartpricing.business.service.BusinessService;
import com.smartpricing.catalog.dto.CatalogDtos.*;
import com.smartpricing.catalog.entity.CatalogStatus;
import com.smartpricing.catalog.service.CatalogService;
import com.smartpricing.common.ApiException;
import com.smartpricing.demo.config.DemoSafetyGuard;
import com.smartpricing.demo.dto.DemoSummary;
import com.smartpricing.demo.dto.DemoSummary.ScenarioSummary;
import com.smartpricing.demo.generator.*;
import com.smartpricing.demo.generator.DemoGenerator.*;
import com.smartpricing.demo.repository.*;
import com.smartpricing.history.dto.HistoryDtos.*;
import com.smartpricing.history.service.VariantHistoryService;
import com.smartpricing.sales.dto.SalesDtos.*;
import com.smartpricing.sales.service.SalesService;
import jakarta.persistence.EntityManager;
import java.math.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Profile("demo")
public class DemoSeedService {
    private final DemoSafetyGuard guard;
    private final DemoGenerator generator;
    private final DemoMetadataRepository metadata;
    private final DemoChecksum checksum;
    private final CatalogService catalog;
    private final BusinessService business;
    private final VariantHistoryService history;
    private final SalesService sales;
    private final JdbcTemplate jdbc;
    private final EntityManager entities;

    public DemoSeedService(DemoSafetyGuard guard,DemoGenerator generator,DemoMetadataRepository metadata,
            DemoChecksum checksum,CatalogService catalog,BusinessService business,VariantHistoryService history,
            SalesService sales,JdbcTemplate jdbc,EntityManager entities) {
        this.guard=guard;this.generator=generator;this.metadata=metadata;this.checksum=checksum;
        this.catalog=catalog;this.business=business;this.history=history;this.sales=sales;this.jdbc=jdbc;this.entities=entities;
    }

    @Transactional
    public DemoSummary seed(DemoSeedConfig config) {
        guard.requireDemo();
        lock();
        return seedWithinTransaction(config);
    }

    @Transactional
    public DemoSummary resetAndSeed(DemoSeedConfig config,String confirmation) {
        guard.requireReset(confirmation);
        validateDates(config);
        lock();
        // Only the verified dedicated demo database; transactional TRUNCATE bypasses immutable-row DELETE triggers.
        jdbc.execute("TRUNCATE shopify_order_metadata,sales_refunds,sales_order_items,sales_orders,variant_price_history,variant_cost_history,inventory_snapshots,product_variants,products,categories,app_metadata,demo_control.catalog_mappings,demo_control.seed_runs");
        entities.clear();
        var settings=business.get();
        business.update(new Update("My Business","MAD",settings.version()));
        return seedWithinTransaction(config);
    }

    @Transactional(readOnly=true)
    public String canonicalExport() {
        guard.requireDemo();
        if(metadata.existing()==null) throw ApiException.missing("Initialized demo dataset");
        return checksum.canonicalExport();
    }

    @Transactional(readOnly=true)
    public Map<String,Object> summary() {
        guard.requireDemo();
        DemoSummary existing=metadata.existing();
        if(existing==null) throw ApiException.missing("Initialized demo dataset");
        String actual=checksum.calculate();
        return Map.of("synthetic",true,"summary",existing,"currentChecksum",actual,"matchesSeed",existing.checksum().equals(actual));
    }

    private DemoSummary seedWithinTransaction(DemoSeedConfig config) {
        validateDates(config);
        DemoSummary existing=metadata.existing();
        if(existing!=null) {
            if(!generator.version().equals(existing.generatorVersion())||existing.seed()!=config.seed()||!existing.startDate().equals(config.startDate()))
                throw ApiException.conflict("DEMO_DATASET_MISMATCH","An existing dataset has a different seed/date/version. Use an explicitly confirmed isolated-demo reset.");
            if(!existing.checksum().equals(checksum.calculate()))
                throw ApiException.conflict("DEMO_DATA_CHANGED","Demo records were edited. They were preserved; inspect the summary or explicitly reset the isolated demo.");
            return existing;
        }
        requireEmpty();
        var settings=business.get();
        business.update(new Update(generator.businessName(),"MAD",settings.version()));
        Map<String,UUID> categoryIds=new LinkedHashMap<>(),productIds=new LinkedHashMap<>(),variantIds=new LinkedHashMap<>();
        List<ProductPlan> plans=generator.products();
        for(ProductPlan plan:plans) {
            String category=plan.scenario().category();
            if(!categoryIds.containsKey(category)) {
                var created=catalog.createCategory(new CategoryWrite(category,"Synthetic demo category.",null));
                categoryIds.put(category,created.id());
                metadata.mapping("category/"+category,"CATEGORY",created.id(),null);
            }
            var product=catalog.createProduct(new ProductWrite(plan.name(),"Synthetic demo item. Generated observations are not real business records.",categoryIds.get(category),CatalogStatus.ARCHIVED,null));
            UUID variant=createVariant(product.id(),plan);
            productIds.put(plan.key(),product.id()); variantIds.put(plan.key(),variant);
            metadata.mapping("product/"+plan.key(),"PRODUCT",product.id(),plan.scenario().name());
            metadata.mapping("variant/"+plan.key(),"VARIANT",variant,plan.scenario().name());
            periods(config,plan,variant,PeriodKind.PRICE,generator.prices(config,plan));
            periods(config,plan,variant,PeriodKind.COST,generator.costs(config,plan));
            // History writes update catalog versions through SQL. Refresh the JPA view before later catalog actions.
            entities.clear();
            catalog.updateProduct(product.id(),new ProductWrite(product.name(),product.description(),product.categoryId(),CatalogStatus.ACTIVE,product.version()));
        }

        for(ProductPlan plan:plans) {
            UUID variant=variantIds.get(plan.key());
            for(LocalDate date=config.startDate();date.isBefore(config.endExclusive());date=date.plusDays(1)) {
                DailyPlan day=generator.day(config,plan,date);
                if(!day.observed()) continue;
                String dayKey=plan.key()+"/"+date;
                history.addInventory(variant,new InventoryWrite(at(date,0),day.available(),Source.DEMO,Quality.SNAPSHOT,key("stock",dayKey)));
                if(day.observedSales()==0) continue;
                var line=new LineWrite(variant,day.observedSales(),day.listedPrice(),day.transactionPrice(),BigDecimal.ZERO,null,"1");
                var order=sales.create(new OrderWrite(Source.DEMO,key("order",dayKey),at(date,12),at(date,12),OrderStatus.COMPLETED,"MAD",BigDecimal.ZERO,BigDecimal.ZERO,List.of(line))).value();
                long index=ChronoUnit.DAYS.between(config.startDate(),date);
                LocalDate refundDate=date.plusDays(2);
                if(refundDate.isBefore(config.endExclusive())) {
                    UUID item=order.lines().getFirst().id();
                    if(generator.returned(plan,index)) {
                        BigDecimal amount=money(day.transactionPrice().multiply(new BigDecimal(index%2==0?"1.00":"0.50")));
                        sales.refund(order.order().id(),new RefundWrite(Source.DEMO,key("return",dayKey),at(refundDate,14),RefundKind.LINE_RETURN,item,1,amount,"MAD","Synthetic partial return."));
                    }
                    if(generator.adjusted(plan,index)) {
                        sales.refund(order.order().id(),new RefundWrite(Source.DEMO,key("adjustment",dayKey),at(refundDate,15),RefundKind.FINANCIAL_ADJUSTMENT,item,0,
                                money(day.transactionPrice().multiply(new BigDecimal("0.25"))),"MAD","Synthetic financial-only adjustment."));
                    }
                }
            }
        }
        entities.clear();
        for(ProductPlan plan:plans) if(generator.archived(plan)) {
            catalog.archiveVariant(productIds.get(plan.key()),variantIds.get(plan.key()),null);
            catalog.archiveProduct(productIds.get(plan.key()),null);
        }
        String digest=checksum.calculate();
        DemoSummary result=new DemoSummary(generator.version(),config.seed(),config.startDate(),config.endExclusive().minusDays(1),
                (int)count("categories"),(int)count("products"),(int)count("product_variants"),count("sales_orders"),count("sales_order_items"),
                count("sales_refunds"),count("variant_price_history"),count("variant_cost_history"),count("inventory_snapshots"),
                jdbc.queryForObject("SELECT count(*) FROM sales_order_items WHERE unit_cost IS NULL",Long.class),
                count("inventory_snapshots")-count("sales_orders"),digest,scenarioSummaries());
        metadata.completed(config,result,generator.groundTruth());
        return result;
    }

    private UUID createVariant(UUID productId,ProductPlan plan) {
        if(plan.baseCost()!=null)
            return catalog.createVariant(productId,new VariantWrite(plan.sku(),"Standard",plan.baseCost(),plan.basePrice(),
                    money(generator.minimumPrice(plan)),money(generator.maximumPrice(plan)),CatalogStatus.ACTIVE,null)).id();
        // The normal editor requires a cost. Demo import represents genuinely missing cost using
        // the existing nullable schema, like external imports; no zero placeholder or relaxed API rule.
        if(!(generator instanceof PortfolioGenerator)) throw ApiException.invalid("Missing cost requires the portfolio import fixture.");
        var variant=new com.smartpricing.catalog.entity.ProductVariant();
        variant.setProductId(productId);variant.setSku(plan.sku());variant.setName("Standard");
        variant.setCostPrice(null);variant.setCurrentPrice(plan.basePrice());
        variant.setMinPrice(money(generator.minimumPrice(plan)));variant.setMaxPrice(money(generator.maximumPrice(plan)));
        variant.setStatus(CatalogStatus.ACTIVE);entities.persist(variant);entities.flush();
        return variant.getId();
    }

    private void periods(DemoSeedConfig config,ProductPlan product,UUID variant,PeriodKind kind,List<PeriodPlan> periods) {
        for(PeriodPlan period:periods) {
            Long version=period.authoritative()&&period.to()==null?jdbc.queryForObject("SELECT version FROM product_variants WHERE id=?",Long.class,variant):null;
            history.addPeriod(kind,variant,new PeriodWrite(period.amount(),"MAD",at(period.from(),0),period.to()==null?null:at(period.to(),0),
                    Source.DEMO,period.authoritative()?Quality.VERIFIED_CHANGE:Quality.SNAPSHOT,key(kind.name().toLowerCase(Locale.ROOT),product.key()+"/"+period.key()),version));
        }
    }

    private List<ScenarioSummary> scenarioSummaries() {
        List<ScenarioSummary> result=new ArrayList<>();
        for(DemoScenario scenario:DemoScenario.values()) {
            String name=scenario.name();
            long orders=jdbc.queryForObject("SELECT count(*) FROM sales_order_items i JOIN demo_control.catalog_mappings m ON m.entity_kind='VARIANT' AND m.entity_id=i.variant_id WHERE m.scenario_id=?",Long.class,name);
            long units=jdbc.queryForObject("SELECT coalesce(sum(i.quantity),0) FROM sales_order_items i JOIN demo_control.catalog_mappings m ON m.entity_kind='VARIANT' AND m.entity_id=i.variant_id WHERE m.scenario_id=?",Long.class,name);
            long refunds=jdbc.queryForObject("SELECT count(*) FROM sales_refunds r JOIN sales_order_items i ON r.item_id=i.id JOIN demo_control.catalog_mappings m ON m.entity_kind='VARIANT' AND m.entity_id=i.variant_id WHERE m.scenario_id=?",Long.class,name);
            long inventory=jdbc.queryForObject("SELECT count(*) FROM inventory_snapshots i JOIN demo_control.catalog_mappings m ON m.entity_kind='VARIANT' AND m.entity_id=i.variant_id WHERE m.scenario_id=?",Long.class,name);
            result.add(new ScenarioSummary(name,3,orders,units,refunds,inventory));
        }
        return List.copyOf(result);
    }

    private void requireEmpty() {
        for(String table:List.of("categories","products","product_variants","sales_orders","sales_refunds","inventory_snapshots","variant_price_history","variant_cost_history","app_metadata","demo_control.catalog_mappings")) {
            if(count(table)>0) throw ApiException.conflict("DEMO_DATABASE_NOT_EMPTY","The isolated demo contains existing data without matching seed metadata. It was preserved.");
        }
        var settings=business.get();
        if(!"My Business".equals(settings.displayName())||!"MAD".equals(settings.currencyCode()))
            throw ApiException.conflict("DEMO_DATABASE_NOT_EMPTY","Existing demo business settings were preserved. Use an explicit isolated-demo reset to replace them.");
    }
    private void validateDates(DemoSeedConfig config) {
        generator.validate(config);
        if(config.endExclusive().atStartOfDay(ZoneOffset.UTC).toInstant().isAfter(Instant.now()))
            throw ApiException.invalid("The demo must cover twelve complete past months; future observations are not allowed.");
    }
    private void lock() { jdbc.queryForList("SELECT pg_advisory_xact_lock(4778340401)"); }
    private long count(String table) { return jdbc.queryForObject("SELECT count(*) FROM "+table,Long.class); }
    private String key(String type,String logical) { return generator.version()+"/"+type+"/"+logical; }
    private Instant at(LocalDate date,int hour) { return date.atTime(hour,0).toInstant(ZoneOffset.UTC); }
    private BigDecimal money(BigDecimal value) { return value.setScale(4,RoundingMode.UNNECESSARY); }
}
