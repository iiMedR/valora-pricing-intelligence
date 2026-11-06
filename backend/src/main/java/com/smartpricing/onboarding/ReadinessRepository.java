package com.smartpricing.onboarding;

import com.smartpricing.catalog.dto.CatalogDtos.PageView;
import com.smartpricing.forecasting.dto.ForecastDtos.Identity;
import com.smartpricing.onboarding.ReadinessDtos.Coverage;
import java.math.BigDecimal;
import java.sql.*;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.namedparam.*;
import org.springframework.stereotype.Repository;

@Repository
public class ReadinessRepository {
    private final NamedParameterJdbcTemplate jdbc;
    public ReadinessRepository(NamedParameterJdbcTemplate jdbc){this.jdbc=jdbc;}
    public record Row(Identity identity,BigDecimal price,BigDecimal cost,BigDecimal min,BigDecimal max,String mappedShop,
        String providerSku,boolean conflict,String costSource,BigDecimal costEvidence,Instant costAt,Integer stock,Instant stockAt,String stockQuality,String stockSource){}
    private static final String BASE="""
        FROM product_variants v JOIN products p ON p.id=v.product_id
        LEFT JOIN shopify_source_mapping m ON m.resource='VARIANT' AND m.local_id=v.id
        LEFT JOIN shopify_source_mapping pm ON pm.resource='PRODUCT' AND pm.local_id=p.id
        LEFT JOIN LATERAL (SELECT source,amount,valid_from FROM variant_cost_history h WHERE h.variant_id=v.id AND h.valid_from<=:now AND h.quality<>'INFERRED'
          ORDER BY h.valid_from DESC,h.id DESC LIMIT 1) cost ON true
        LEFT JOIN LATERAL (SELECT quantity_available,observed_at,quality,source FROM inventory_snapshots s WHERE s.variant_id=v.id AND s.observed_at<=:now
          ORDER BY s.observed_at DESC,s.id DESC LIMIT 1) stock ON true
        WHERE (CAST(:shop AS text) IS NULL OR m.local_id IS NULL OR m.shop_domain=:shop)
          AND (CAST(:shop AS text) IS NULL OR pm.local_id IS NULL OR pm.shop_domain=:shop)
        """;
    private static final String COLUMNS="""
        v.*,p.name product_name,p.status product_status,m.shop_domain,m.source_sku,
        ((m.local_id IS NOT NULL AND m.local_version IS DISTINCT FROM v.version) OR (pm.local_id IS NOT NULL AND pm.local_version IS DISTINCT FROM p.version)) local_conflict,
        cost.source cost_source,cost.amount cost_evidence,cost.valid_from cost_at,stock.quantity_available stock,stock.observed_at stock_at,stock.quality stock_quality,stock.source stock_source
        """;
    private MapSqlParameterSource params(String shop,Instant now){return new MapSqlParameterSource("shop",shop).addValue("now",Timestamp.from(now)).addValue("fresh",Timestamp.from(now.minus(Duration.ofHours(24))));}
    private String filter(String status){return switch(status){
        case "ALL"->"";case "ACTIVE"->" AND v.status='ACTIVE' AND p.status='ACTIVE'";case "ARCHIVED"->" AND (v.status='ARCHIVED' OR p.status='ARCHIVED')";
        case "MISSING_COST"->" AND v.cost_price IS NULL";case "STALE_INVENTORY"->" AND (stock.observed_at IS NULL OR stock.observed_at<:fresh OR stock.quality='INFERRED')";
        case "LOCAL_CONFLICT"->" AND ((m.local_id IS NOT NULL AND m.local_version IS DISTINCT FROM v.version) OR (pm.local_id IS NOT NULL AND pm.local_version IS DISTINCT FROM p.version))";
        case "MISSING_PROVIDER_SKU"->" AND m.local_id IS NOT NULL AND coalesce(btrim(m.source_sku),'')=''";
        default->throw com.smartpricing.common.ApiException.invalid("Unsupported readiness filter.");};}
    public PageView<Row> page(String shop,Instant now,int page,int size,String search,String status){
        var args=params(shop,now).addValue("search",search).addValue("size",size).addValue("offset",(long)page*size);
        String where=BASE+" AND strpos(lower(v.sku||' '||v.name||' '||p.name),lower(:search))>0"+filter(status);
        long count=jdbc.queryForObject("SELECT count(*) "+where,args,Long.class);
        var rows=jdbc.query("SELECT "+COLUMNS+where+" ORDER BY lower(p.name),v.sku,v.id LIMIT :size OFFSET :offset",args,this::row);
        return new PageView<>(rows,page,size,count,(int)((count+size-1)/size));
    }
    public Row row(String shop,Instant now,UUID id){var rows=jdbc.query("SELECT "+COLUMNS+BASE+" AND v.id=:id",params(shop,now).addValue("id",id),this::row);if(rows.isEmpty())throw com.smartpricing.common.ApiException.missing("Variant in this business/store scope");return rows.getFirst();}
    public Map<UUID,Coverage> coverage(List<UUID> ids,LocalDate start,LocalDate end){
        Map<UUID,Coverage> result=new HashMap<>();if(ids.isEmpty())return result;
        var args=new MapSqlParameterSource("ids",ids).addValue("start",Timestamp.from(start.atStartOfDay(ZoneOffset.UTC).toInstant())).addValue("end",Timestamp.from(end.atStartOfDay(ZoneOffset.UTC).toInstant()));
        jdbc.query("""
            WITH sales AS (
              SELECT i.variant_id,count(DISTINCT o.id) orders,count(*) lines,count(i.unit_cost) known,
                count(DISTINCT (o.placed_at AT TIME ZONE 'UTC')::date) days,
                min((o.placed_at AT TIME ZONE 'UTC')::date) first_sale,max((o.placed_at AT TIME ZONE 'UTC')::date) last_sale
              FROM sales_order_items i JOIN sales_orders o ON o.id=i.order_id
              WHERE i.variant_id IN (:ids) AND o.status='COMPLETED' AND o.placed_at>=:start AND o.placed_at<:end GROUP BY i.variant_id
            ), refunds AS (
              SELECT i.variant_id,count(*) refunds FROM sales_refunds r JOIN sales_order_items i ON i.id=r.item_id JOIN sales_orders o ON o.id=r.order_id
              WHERE i.variant_id IN (:ids) AND o.status='COMPLETED' AND r.refunded_at>=:start AND r.refunded_at<:end
                AND r.kind IN ('LINE_RETURN','FINANCIAL_ADJUSTMENT') GROUP BY i.variant_id
            ) SELECT v.id,coalesce(s.orders,0) orders,coalesce(s.lines,0) lines,coalesce(s.known,0) known,
              coalesce(s.days,0) days,s.first_sale,s.last_sale,coalesce(r.refunds,0) refunds
            FROM product_variants v LEFT JOIN sales s ON s.variant_id=v.id LEFT JOIN refunds r ON r.variant_id=v.id WHERE v.id IN (:ids)
            """,args,(org.springframework.jdbc.core.RowCallbackHandler)rs->result.put(rs.getObject("id",UUID.class),new Coverage(rs.getLong("orders"),rs.getLong("lines"),rs.getLong("known"),rs.getLong("days"),date(rs,"first_sale"),date(rs,"last_sale"),rs.getLong("refunds"))));
        return result;
    }
    public Map<String,Long> counts(String shop,Instant now,LocalDate start,LocalDate end){
        var args=params(shop,now).addValue("start",Timestamp.from(start.atStartOfDay(ZoneOffset.UTC).toInstant())).addValue("end",Timestamp.from(end.atStartOfDay(ZoneOffset.UTC).toInstant()));
        var counts=jdbc.queryForMap("""
            SELECT count(*) variants,count(DISTINCT p.id) products,
              count(*) FILTER(WHERE v.status='ACTIVE' AND p.status='ACTIVE') active_variants,
              count(*) FILTER(WHERE m.local_id IS NOT NULL) mapped_variants,
              count(*) FILTER(WHERE (m.local_id IS NOT NULL AND m.local_version IS DISTINCT FROM v.version) OR (pm.local_id IS NOT NULL AND pm.local_version IS DISTINCT FROM p.version)) local_conflicts,
              count(*) FILTER(WHERE v.cost_price IS NULL) missing_cost,
              count(*) FILTER(WHERE m.local_id IS NOT NULL AND coalesce(btrim(m.source_sku),'')='') missing_provider_sku,
              count(*) FILTER(WHERE stock.observed_at IS NULL) unknown_stock,
              count(*) FILTER(WHERE stock.observed_at<:fresh OR stock.quality='INFERRED') stale_or_uncertain_stock,
              count(*) FILTER(WHERE stock.quantity_available=0 AND stock.observed_at>=:fresh AND stock.quality<>'INFERRED') current_stockouts
            """+BASE,args);
        Map<String,Long> result=new LinkedHashMap<>();counts.forEach((key,value)->result.put(key,((Number)value).longValue()));
        var sales=jdbc.queryForMap("""
            WITH scope AS (SELECT v.id
            """+BASE+"""
            ), lines AS (SELECT i.*,o.status,o.placed_at FROM sales_order_items i JOIN sales_orders o ON o.id=i.order_id
                WHERE i.variant_id IN(SELECT id FROM scope) AND o.placed_at>=:start AND o.placed_at<:end)
            SELECT count(DISTINCT order_id) orders,count(*) lines,
              count(DISTINCT order_id) FILTER(WHERE status='UNPAID') unpaid_orders,
              count(DISTINCT order_id) FILTER(WHERE status='CANCELLED') cancelled_orders,
              count(*) FILTER(WHERE status='COMPLETED') completed_lines,
              count(*) FILTER(WHERE status='COMPLETED' AND unit_cost IS NOT NULL) known_cost_lines,
              count(DISTINCT (placed_at AT TIME ZONE 'UTC')::date) FILTER(WHERE status='COMPLETED') sales_days,
              (SELECT count(*) FROM sales_refunds r JOIN sales_orders o ON o.id=r.order_id
                WHERE r.refunded_at>=:start AND r.refunded_at<:end AND o.status='COMPLETED'
                AND EXISTS(SELECT 1 FROM sales_order_items i WHERE i.order_id=o.id AND i.variant_id IN(SELECT id FROM scope))) refund_events
            FROM lines
            """,args);
        sales.forEach((key,value)->result.put(key,((Number)value).longValue()));
        long empty=jdbc.queryForObject("SELECT count(*) FROM products p WHERE NOT EXISTS(SELECT 1 FROM product_variants v WHERE v.product_id=p.id) AND (CAST(:shop AS text) IS NULL OR NOT EXISTS(SELECT 1 FROM shopify_source_mapping m WHERE m.resource='PRODUCT' AND m.local_id=p.id) OR EXISTS(SELECT 1 FROM shopify_source_mapping m WHERE m.resource='PRODUCT' AND m.local_id=p.id AND m.shop_domain=:shop))",args,Long.class);
        result.put("empty_products",empty);result.put("products",result.get("products")+empty);
        result.put("imported_products",jdbc.queryForObject("SELECT count(*) FROM shopify_source_mapping m JOIN products p ON p.id=m.local_id WHERE m.resource='PRODUCT' AND (CAST(:shop AS text) IS NULL OR m.shop_domain=:shop)",args,Long.class));return result;
    }
    private Row row(ResultSet rs,int n)throws SQLException{return new Row(new Identity(rs.getObject("id",UUID.class),rs.getObject("product_id",UUID.class),rs.getString("product_name"),rs.getString("name"),rs.getString("sku"),rs.getString("status"),rs.getString("product_status")),rs.getBigDecimal("current_price"),rs.getBigDecimal("cost_price"),rs.getBigDecimal("min_price"),rs.getBigDecimal("max_price"),rs.getString("shop_domain"),rs.getString("source_sku"),rs.getBoolean("local_conflict"),rs.getString("cost_source"),rs.getBigDecimal("cost_evidence"),time(rs,"cost_at"),(Integer)rs.getObject("stock"),time(rs,"stock_at"),rs.getString("stock_quality"),rs.getString("stock_source"));}
    private Instant time(ResultSet rs,String name)throws SQLException{var value=rs.getTimestamp(name);return value==null?null:value.toInstant();}
    private LocalDate date(ResultSet rs,String name)throws SQLException{var value=rs.getDate(name);return value==null?null:value.toLocalDate();}
}
