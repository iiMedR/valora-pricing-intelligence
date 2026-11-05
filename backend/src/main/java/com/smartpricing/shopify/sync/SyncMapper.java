package com.smartpricing.shopify.sync;

import com.fasterxml.jackson.databind.*;
import com.smartpricing.history.dto.HistoryDtos.*;
import com.smartpricing.history.service.*;
import com.smartpricing.sales.dto.SalesDtos.*;
import com.smartpricing.sales.service.SalesService;
import com.smartpricing.shopify.ShopifyRules;
import java.math.*;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Version 1 mapping. Called only inside the coordinator's page transaction. */
@Service
public class SyncMapper {
    private final JdbcTemplate jdbc;private final SyncRepository repository;private final HistorySupport support;private final VariantHistoryService history;private final SalesService sales;
    public SyncMapper(JdbcTemplate jdbc,SyncRepository repository,HistorySupport support,VariantHistoryService history,SalesService sales){this.jdbc=jdbc;this.repository=repository;this.support=support;this.history=history;this.sales=sales;}
    private String currency(){return jdbc.queryForObject("SELECT currency_code FROM business_settings WHERE id=1",String.class);}
    public static void count(Map<String,Integer> counts,String resource){counts.merge(resource,1,Integer::sum);}
    public static void warn(List<String> warnings,String code){if(!warnings.contains(code)&&warnings.size()<32)warnings.add(code);}
    private String key(String shop,String kind,String external){return "sp5:"+ShopifyRules.hash(shop+"|"+kind+"|"+external);}
    private String sku(String shop,String id){return "SHOPIFY-"+ShopifyRules.hash(shop+"|"+id).substring(0,40);}
    private Long version(String table,UUID id){return jdbc.queryForObject("SELECT version FROM "+table+" WHERE id=?",Long.class,id);}
    private void owned(String table,SyncRepository.Mapping mapping){if(!Objects.equals(version(table,mapping.id()),mapping.version()))throw new SyncFailure("LOCAL_EDIT_CONFLICT");}
    private UUID product(SyncRepository.Job job,JsonNode source,List<String> warnings){
        String external=SyncRules.id(source),name=SyncRules.text(source,"title",160);if(name.codePointCount(0,name.length())<2){name="Shopify "+name;warn(warnings,"SHORT_PRODUCT_TITLE_LABELLED");}
        String hash=support.fingerprint(List.of(name,source.path("status").asText()));var mapping=repository.mapping(job.shop(),"PRODUCT",external);UUID id=mapping==null?UUID.randomUUID():mapping.id();
        if(mapping==null)jdbc.update("INSERT INTO products(id,name,status) VALUES(?,?,'ARCHIVED')",id,name);
        else {jdbc.queryForList("SELECT id FROM products WHERE id=? FOR UPDATE",id);owned("products",mapping);if(!hash.equals(mapping.hash()))jdbc.update("UPDATE products SET name=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?",name,id);}
        repository.map(job.shop(),"PRODUCT",external,id,hash,version("products",id),job.id(),null,SyncRules.time(source,"updatedAt"));return id;
    }
    public void catalog(SyncRepository.Job job,JsonNode source,Map<String,Integer> counts,List<String> warnings){
        // Settings -> product -> variant matches manual creation and keeps currency stable through this page.
        jdbc.queryForList("SELECT id FROM business_settings WHERE id=1 FOR UPDATE");
        String external=SyncRules.id(source),currency=currency();UUID parent=product(job,source.path("product"),warnings);
        BigDecimal price;
        try{price=new BigDecimal(source.path("price").asText()).setScale(4,RoundingMode.UNNECESSARY);if(price.signum()<0||price.precision()-price.scale()>15)throw new IllegalArgumentException();}catch(RuntimeException e){throw new SyncFailure("UNSUPPORTED_MONEY_PRECISION");}
        JsonNode item=source.path("inventoryItem"),costNode=item.path("unitCost");BigDecimal cost=costNode.isObject()?SyncRules.amount(costNode,currency):null;
        if(cost==null)warn(warnings,"COST_UNAVAILABLE");if(price.signum()==0)warn(warnings,"FREE_VARIANT_ARCHIVED");
        String status="ACTIVE".equals(source.path("product").path("status").asText())&&price.signum()>0?"ACTIVE":"ARCHIVED";
        String name=SyncRules.text(source,"title",120);Instant updated=SyncRules.time(source,"updatedAt"),observed=Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS);
        String hash=support.fingerprint(Arrays.asList(parent,name,price,cost,status,source.path("sku").asText("")));
        var mapping=repository.mapping(job.shop(),"VARIANT",external);UUID id=mapping==null?UUID.randomUUID():mapping.id();boolean changed=mapping==null||!mapping.hash().equals(hash)||!status.equals(jdbc.queryForObject("SELECT status FROM product_variants WHERE id=?",String.class,id));
        if(mapping==null){
            // Match settings/catalog lock ordering; do not infer or reuse a manual SKU.
            jdbc.queryForList("SELECT id FROM business_settings WHERE id=1 FOR UPDATE");
            jdbc.update("INSERT INTO product_variants(id,product_id,sku,name,cost_price,current_price,min_price,max_price,status) VALUES(?,?,?,?,?,?,?,?,?)",id,parent,sku(job.shop(),external),name,cost,price,price,(price.signum()>0?price:BigDecimal.ONE),status);
        }else{
            jdbc.queryForList("SELECT id FROM product_variants WHERE id=? FOR UPDATE",id);owned("product_variants",mapping);
            if(!parent.equals(jdbc.queryForObject("SELECT product_id FROM product_variants WHERE id=?",UUID.class,id)))throw new SyncFailure("VARIANT_PARENT_CONFLICT");
            if(changed)jdbc.update("UPDATE product_variants SET name=?,cost_price=?,current_price=?,min_price=?,max_price=?,status=?,version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=?",name,cost,price,price,(price.signum()>0?price:BigDecimal.ONE),status,id);
        }
        if(changed){
            if(price.signum()>0)history.addPeriod(PeriodKind.PRICE,id,new PeriodWrite(price,currency,observed,null,Source.SHOPIFY,Quality.SNAPSHOT,key(job.shop(),"PRICE",job.id()+"|"+external+"|"+hash),null));
            if(cost!=null)history.addPeriod(PeriodKind.COST,id,new PeriodWrite(cost,currency,observed,null,Source.SHOPIFY,Quality.SNAPSHOT,key(job.shop(),"COST",job.id()+"|"+external+"|"+hash),null));
            count(counts,"variantsChanged");
        }
        repository.map(job.shop(),"VARIANT",external,id,hash,version("product_variants",id),job.id(),source.path("sku").asText(""),updated);
        String parentStatus=jdbc.queryForObject("SELECT CASE WHEN EXISTS(SELECT 1 FROM product_variants WHERE product_id=? AND status='ACTIVE') THEN 'ACTIVE' ELSE 'ARCHIVED' END",String.class,parent);
        jdbc.update("UPDATE products SET status=? WHERE id=?",parentStatus,parent);
        inventory(job,source,id,counts,warnings,observed);count(counts,"variantsRead");
    }
    private void inventory(SyncRepository.Job job,JsonNode source,UUID variant,Map<String,Integer> counts,List<String>warnings,Instant observed){
        JsonNode item=source.path("inventoryItem"),levels=source.path("_levels");
        if(!item.path("tracked").asBoolean()||!levels.isArray()||levels.isEmpty()){warn(warnings,"INVENTORY_UNKNOWN");return;}
        String inventory=SyncRules.id(item);int total=0;boolean unknown=false;
        for(JsonNode level:levels){
            String location=SyncRules.id(level.path("location"));Instant updated=SyncRules.time(level,"updatedAt");Integer available=null;
            for(JsonNode quantity:level.path("quantities"))if("available".equals(quantity.path("name").asText())&&quantity.path("quantity").canConvertToInt())available=quantity.path("quantity").asInt();
            if(available==null){unknown=true;continue;}if(available<0)unknown=true;else try{total=Math.addExact(total,available);}catch(ArithmeticException e){throw new SyncFailure("INVENTORY_OVERFLOW");}
            var old=jdbc.queryForList("SELECT available FROM shopify_inventory_location WHERE shop_domain=? AND inventory_item_id=? AND location_id=? AND source_updated_at=?",Integer.class,job.shop(),inventory,location,Timestamp.from(updated));
            if(!old.isEmpty()&&old.getFirst()!=available.intValue())throw new SyncFailure("INVENTORY_SOURCE_CONFLICT");
            jdbc.update("INSERT INTO shopify_inventory_location(shop_domain,inventory_item_id,location_id,source_updated_at,available,observed_at) VALUES(?,?,?,?,?,?) ON CONFLICT DO NOTHING",job.shop(),inventory,location,Timestamp.from(updated),available,Timestamp.from(observed));
        }
        if(unknown){warn(warnings,"INVENTORY_NEGATIVE_OR_UNKNOWN_NOT_AGGREGATED");return;}
        String hash=support.fingerprint(levels);var old=repository.mapping(job.shop(),"INVENTORY",inventory);
        if(old!=null&&old.hash().equals(hash))return;
        var result=history.addInventory(variant,new InventoryWrite(observed,total,Source.SHOPIFY,Quality.SNAPSHOT,key(job.shop(),"INVENTORY",inventory+"|"+hash)));
        repository.map(job.shop(),"INVENTORY",inventory,result.value().id(),hash,null,job.id(),null,null);count(counts,"inventoryObservations");
    }
    public void order(SyncRepository.Job job,JsonNode source,Map<String,Integer> counts,List<String>warnings){
        String external=SyncRules.id(source),currency=currency();if(!currency.equals(source.path("currencyCode").asText()))throw new SyncFailure("UNSUPPORTED_CURRENCY");
        if(source.path("test").asBoolean()){warn(warnings,"TEST_ORDER_EXCLUDED");count(counts,"ordersExcluded");return;}
        if(source.path("taxesIncluded").asBoolean())throw new SyncFailure("TAX_INCLUSIVE_ORDER_REQUIRES_RECONCILIATION");
        SyncRules.complete(source.path("lineItems"));
        String financial=source.path("displayFinancialStatus").asText();
        boolean completed=Set.of("PAID","PARTIALLY_REFUNDED","REFUNDED").contains(financial);
        // Pending/authorized/partial-payment records may change: do not freeze them as recognized revenue.
        if(!completed&&source.path("cancelledAt").isNull()){warn(warnings,"UNSETTLED_ORDER_DEFERRED");count(counts,"ordersExcluded");return;}
        OrderStatus status=source.path("cancelledAt").isNull()?OrderStatus.COMPLETED:OrderStatus.CANCELLED;
        List<LineWrite> lines=new ArrayList<>();Map<String,SalesService.ImportedIdentity> identities=new TreeMap<>();int fulfilled=0;
        for(JsonNode line:source.path("lineItems").path("nodes")){
            String lineId=SyncRules.id(line);JsonNode variant=line.path("variant");String variantId;
            if(variant.isObject())variantId=SyncRules.id(variant);else variantId="missing-line:"+lineId;
            var mapped=repository.mapping(job.shop(),"VARIANT",variantId);UUID local=mapped==null?placeholder(job,variantId,line):mapped.id();
            int quantity=line.path("quantity").asInt();if(quantity<1||quantity>1000000)throw new SyncFailure("UNSUPPORTED_ORDER_QUANTITY");
            BigDecimal unit=SyncRules.bag(line,"originalUnitPriceSet",currency),discount=BigDecimal.ZERO.setScale(4);
            for(JsonNode allocation:line.path("discountAllocations"))discount=discount.add(SyncRules.bag(allocation,"allocatedAmountSet",currency));
            lines.add(new LineWrite(local,quantity,null,unit,discount,null,lineId));
            String lineSku=line.path("sku").asText("");if(lineSku.isBlank())lineSku=sku(job.shop(),variantId);if(lineSku.length()>80)lineSku=lineSku.substring(0,80);
            identities.put(lineId,new SalesService.ImportedIdentity(lineSku,SyncRules.text(line,"title",120)));
            fulfilled+=Math.max(0,quantity-line.path("unfulfilledQuantity").asInt(quantity));
        }
        if(lines.isEmpty())throw new SyncFailure("ORDER_HAS_NO_SUPPORTED_LINES");
        Instant placed=SyncRules.time(source,"createdAt"),updated=SyncRules.time(source,"updatedAt");
        var input=new OrderWrite(Source.SHOPIFY,key(job.shop(),"ORDER",external),placed,null,status,currency,SyncRules.bag(source,"totalShippingPriceSet",currency),SyncRules.bag(source,"totalTaxSet",currency),lines);
        String hash=support.fingerprint(List.of(input,identities));var mapped=repository.mapping(job.shop(),"ORDER",external);UUID id;
        if(mapped!=null){if(!mapped.hash().equals(hash))throw new SyncFailure("IMMUTABLE_ORDER_CONFLICT");id=mapped.id();}
        else {var result=sales.createImported(input,identities);id=result.value().order().id();repository.map(job.shop(),"ORDER",external,id,hash,null,job.id(),null,updated);count(counts,"ordersImported");}
        var detail=sales.detail(id);
        for(var line:detail.lines())repository.map(job.shop(),"LINE",line.sourceLineReference(),line.id(),support.fingerprint(line),null,job.id(),null,updated);
        jdbc.update("INSERT INTO shopify_order_metadata(order_id,source_updated_at,financial_status,fulfillment_status,cancelled_at,fulfilled_quantity) VALUES(?,?,?,?,?,?) ON CONFLICT(order_id) DO UPDATE SET source_updated_at=excluded.source_updated_at,financial_status=excluded.financial_status,fulfillment_status=excluded.fulfillment_status,cancelled_at=excluded.cancelled_at,fulfilled_quantity=excluded.fulfilled_quantity",id,Timestamp.from(updated),financial,source.path("displayFulfillmentStatus").asText(),source.path("cancelledAt").isNull()?null:Timestamp.from(SyncRules.time(source,"cancelledAt")),fulfilled);
        if(status==OrderStatus.COMPLETED)for(JsonNode refund:source.path("refunds"))refund(job,refund,detail,counts,warnings,currency);
        else if(!source.path("refunds").isEmpty())warn(warnings,"CANCELLED_ORDER_REFUNDS_NOT_RECOGNIZED");
        count(counts,"ordersRead");
    }
    private UUID placeholder(SyncRepository.Job job,String external,JsonNode line){
        // Removed/custom lines remain queryable, explicitly archived, without invented current prices/costs.
        UUID product=UUID.randomUUID(),variant=UUID.randomUUID();
        jdbc.queryForList("SELECT id FROM business_settings WHERE id=1 FOR UPDATE");
        jdbc.update("INSERT INTO products(id,name,status) VALUES(?,'Unavailable Shopify historical item','ARCHIVED')",product);
        jdbc.update("INSERT INTO product_variants(id,product_id,sku,name,cost_price,current_price,min_price,max_price,status) VALUES(?,?,?,?,NULL,0,0,1,'ARCHIVED')",variant,product,sku(job.shop(),external),SyncRules.text(line,"title",120));
        repository.map(job.shop(),"VARIANT",external,variant,"historical-placeholder",0L,job.id(),null,null);return variant;
    }
    private void refund(SyncRepository.Job job,JsonNode source,OrderDetail detail,Map<String,Integer> counts,List<String>warnings,String currency){
        String refund=SyncRules.id(source);SyncRules.complete(source.path("refundLineItems"));SyncRules.complete(source.path("refundShippingLines"));
        SyncRules.complete(source.path("transactions"));
        BigDecimal successful=BigDecimal.ZERO.setScale(4);
        for(JsonNode transaction:source.path("transactions").path("nodes"))if("SUCCESS".equals(transaction.path("status").asText())&&"REFUND".equals(transaction.path("kind").asText()))successful=successful.add(SyncRules.bag(transaction,"amountSet",currency));
        if(successful.compareTo(SyncRules.bag(source,"totalRefundedSet",currency))!=0){warn(warnings,"REFUND_PAYMENT_NOT_FULLY_SUCCESSFUL_DEFERRED");return;}
        Instant at=SyncRules.time(source,"processedAt");BigDecimal represented=BigDecimal.ZERO.setScale(4),tax=BigDecimal.ZERO.setScale(4);
        for(JsonNode line:source.path("refundLineItems").path("nodes")){
            var item=detail.lines().stream().filter(l->Objects.equals(l.sourceLineReference(),SyncRules.id(line.path("lineItem")))).findFirst().orElseThrow(()->new SyncFailure("REFUND_LINE_MAPPING_MISSING"));
            BigDecimal amount=SyncRules.bag(line,"subtotalSet",currency);tax=tax.add(SyncRules.bag(line,"totalTaxSet",currency));represented=represented.add(amount);int quantity=line.path("quantity").asInt();
            // Shopify refund quantity is not proof of a physical return. Keep net units conservative.
            RefundKind kind="RETURN".equals(line.path("restockType").asText())&&quantity>0?RefundKind.LINE_RETURN:RefundKind.FINANCIAL_ADJUSTMENT;
            if(kind==RefundKind.FINANCIAL_ADJUSTMENT&&amount.signum()==0){warn(warnings,"ZERO_FINANCIAL_REFUND_NOT_REPRESENTED");continue;}
            var result=sales.refund(detail.order().id(),new RefundWrite(Source.SHOPIFY,key(job.shop(),"REFUND_LINE",refund+"|"+SyncRules.id(line)),at,kind,item.id(),kind==RefundKind.LINE_RETURN?quantity:0,amount,currency,null));
            if(result.created())count(counts,"refundsImported");repository.map(job.shop(),"REFUND",SyncRules.id(line),result.value().id(),support.fingerprint(line),null,job.id(),null,at);
        }
        BigDecimal shipping=BigDecimal.ZERO.setScale(4);
        for(JsonNode line:source.path("refundShippingLines").path("nodes")){shipping=shipping.add(SyncRules.bag(line,"subtotalAmountSet",currency));tax=tax.add(SyncRules.bag(line,"taxAmountSet",currency));}
        for(RefundKind kind:List.of(RefundKind.SHIPPING,RefundKind.TAX)){
            BigDecimal amount=kind==RefundKind.SHIPPING?shipping:tax;if(amount.signum()>0){var result=sales.refund(detail.order().id(),new RefundWrite(Source.SHOPIFY,key(job.shop(),kind.name(),refund),at,kind,null,0,amount,currency,null));if(result.created())count(counts,"refundsImported");}
        }
        represented=represented.add(shipping).add(tax);
        if(represented.compareTo(SyncRules.bag(source,"totalRefundedSet",currency))!=0)warn(warnings,"REFUND_UNALLOCATED_COMPONENT_NOT_IMPORTED");
    }
    public void archiveMissing(SyncRepository.Job job,List<String>warnings){
        var missing=jdbc.queryForList("SELECT local_id,local_version FROM shopify_source_mapping WHERE shop_domain=? AND resource='VARIANT' AND seen_job IS DISTINCT FROM ? AND payload_hash<>'historical-placeholder'",job.shop(),job.id());
        for(var row:missing){UUID id=(UUID)row.get("local_id");if(!Objects.equals(version("product_variants",id),row.get("local_version")))throw new SyncFailure("LOCAL_EDIT_CONFLICT");
            int changed=jdbc.update("UPDATE product_variants SET status='ARCHIVED',version=version+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND version=?",id,row.get("local_version"));
            if(changed!=1)throw new SyncFailure("LOCAL_EDIT_CONFLICT");
            jdbc.update("UPDATE shopify_source_mapping SET local_version=? WHERE resource='VARIANT' AND local_id=?",version("product_variants",id),id);}
        jdbc.update("UPDATE products p SET status='ARCHIVED' WHERE EXISTS(SELECT 1 FROM shopify_source_mapping m WHERE m.resource='PRODUCT' AND m.shop_domain=? AND m.local_id=p.id) AND NOT EXISTS(SELECT 1 FROM product_variants v WHERE v.product_id=p.id AND v.status='ACTIVE')",job.shop());
    }
}
