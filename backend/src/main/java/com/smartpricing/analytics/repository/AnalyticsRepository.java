package com.smartpricing.analytics.repository;

import com.smartpricing.analytics.dto.AnalyticsDtos.*;
import com.smartpricing.analytics.service.AnalyticsRules;
import com.smartpricing.catalog.dto.CatalogDtos.PageView;
import com.smartpricing.common.ApiException;
import java.sql.*;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.namedparam.*;
import org.springframework.stereotype.Repository;

@Repository
public class AnalyticsRepository {
    private final NamedParameterJdbcTemplate jdbc;
    public AnalyticsRepository(NamedParameterJdbcTemplate jdbc) { this.jdbc=jdbc; }
    // Independent event branches prevent any sale × refund multiplication. No current price/cost joins.
    private static final String EVENTS="""
        WITH events AS (
          SELECT i.variant_id,v.product_id,o.id order_id,o.placed_at at, i.line_net gross,0::numeric refunded,
            i.quantity::bigint units,0::bigint returned,1 sold,
            CASE WHEN i.unit_cost IS NOT NULL THEN 1 ELSE 0 END known_sale,0 refund_event,0 known_refund,
            CASE WHEN i.unit_cost IS NOT NULL THEN i.line_net ELSE 0 END known_sales,0::numeric known_refunds,
            coalesce(i.unit_cost*i.quantity,0) sold_cost
          FROM sales_orders o JOIN sales_order_items i ON i.order_id=o.id JOIN product_variants v ON v.id=i.variant_id
          WHERE o.status='COMPLETED' AND o.placed_at>=:start AND o.placed_at<:end
          UNION ALL
          SELECT i.variant_id,v.product_id,NULL::uuid,r.refunded_at,0,r.amount,0,r.quantity,0,0,1,
            CASE WHEN i.unit_cost IS NOT NULL THEN 1 ELSE 0 END,0,
            CASE WHEN i.unit_cost IS NOT NULL THEN r.amount ELSE 0 END,0
          FROM sales_refunds r JOIN sales_orders o ON o.id=r.order_id
            JOIN sales_order_items i ON i.id=r.item_id JOIN product_variants v ON v.id=i.variant_id
          WHERE o.status='COMPLETED' AND r.refunded_at>=:start AND r.refunded_at<:end
            AND r.kind IN ('LINE_RETURN','FINANCIAL_ADJUSTMENT')
        )
        """;
    private static final String AGG="""
        coalesce(sum(gross),0) gross,coalesce(sum(refunded),0) refunded,coalesce(sum(units),0) units,
        coalesce(sum(returned),0) returned,count(DISTINCT order_id) orders,coalesce(sum(sold),0) lines,
        coalesce(sum(known_sale),0) known_lines,coalesce(sum(refund_event),0) refund_events,
        coalesce(sum(known_refund),0) known_refund_events,coalesce(sum(known_sales),0) known_sales,
        coalesce(sum(known_refunds),0) known_refunds,coalesce(sum(sold_cost),0) sold_cost
        """;
    public MapSqlParameterSource params(LocalDate start,LocalDate end) {
        return new MapSqlParameterSource("start",Timestamp.from(start.atStartOfDay(ZoneOffset.UTC).toInstant()))
                .addValue("end",Timestamp.from(end.atStartOfDay(ZoneOffset.UTC).toInstant()));
    }
    public void currency(MapSqlParameterSource p,String currency) {
        p.addValue("currency",currency);
        Boolean invalid=jdbc.queryForObject("""
            SELECT EXISTS(SELECT 1 FROM sales_orders WHERE status='COMPLETED' AND placed_at>=:start AND placed_at<:end AND currency_code<>:currency)
            OR EXISTS(SELECT 1 FROM sales_refunds r JOIN sales_orders o ON o.id=r.order_id
                WHERE o.status='COMPLETED' AND r.refunded_at>=:start AND r.refunded_at<:end AND r.currency_code<>:currency)
            """,p,Boolean.class);
        if(Boolean.TRUE.equals(invalid)) throw ApiException.conflict("ANALYTICS_CURRENCY_MISMATCH","Selected history contains a currency different from business settings.");
    }
    public Metrics overview(MapSqlParameterSource p) { return jdbc.queryForObject(EVENTS+" SELECT "+AGG+" FROM events",p,(rs,n)->metrics(rs)); }
    public Map<LocalDate,Metrics> trends(MapSqlParameterSource p,Granularity granularity) {
        String unit=granularity==Granularity.DAY?"day":"month";
        Map<LocalDate,Metrics> result=new HashMap<>();
        jdbc.query(EVENTS+" SELECT date_trunc('"+unit+"',at AT TIME ZONE 'UTC')::date bucket,"+AGG+" FROM events GROUP BY bucket",p,
                (org.springframework.jdbc.core.RowCallbackHandler)rs->result.put(rs.getDate("bucket").toLocalDate(),metrics(rs)));
        return result;
    }
    public PageView<Performance> performance(MapSqlParameterSource p,UUID product,int page,int size,Sort sort,String search) {
        boolean variants=product!=null;
        if(variants && !Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM products WHERE id=:product)",new MapSqlParameterSource("product",product),Boolean.class)))
            throw ApiException.missing("Product");
        p.addValue("product",product).addValue("search",search).addValue("size",size).addValue("offset",(long)page*size);
        String identity=variants?"v.id":"p.id";
        String from=variants?"product_variants v JOIN products p ON p.id=v.product_id":"products p";
        String where=variants?" WHERE p.id=:product AND (strpos(lower(v.name),lower(:search))>0 OR strpos(lower(v.sku),lower(:search))>0)":" WHERE strpos(lower(p.name),lower(:search))>0";
        long count=jdbc.queryForObject("SELECT count(*) FROM "+from+where,p,Long.class);
        String order=switch(sort) { case NET_DESC->"(coalesce(a.gross,0)-coalesce(a.refunded,0)) DESC,"; case GROSS_DESC->"coalesce(a.gross,0) DESC,"; case NAME_ASC->""; };
        String name=variants?"v.name":"p.name";
        var content=jdbc.query(EVENTS+", aggregated AS (SELECT "+(variants?"variant_id":"product_id")+" id,"+AGG+" FROM events GROUP BY 1) SELECT p.id product_id,"
                +(variants?"v.id variant_id,v.sku,v.status,":"NULL::uuid variant_id,NULL::text sku,p.status,")+name+" name,p.status product_status,a.* FROM "+from
                +" LEFT JOIN aggregated a ON a.id="+identity+where+" ORDER BY "+order+"lower("+name+"),"+identity+" LIMIT :size OFFSET :offset",p,
                (rs,n)->new Performance(rs.getObject("product_id",UUID.class),rs.getObject("variant_id",UUID.class),rs.getString("name"),rs.getString("sku"),rs.getString("status"),rs.getString("product_status"),metrics(rs)));
        return new PageView<>(content,page,size,count,(int)((count+size-1)/size));
    }
    private static final String STOCK="""
        WITH stock AS (
          SELECT p.id product_id,v.id variant_id,p.name product_name,v.name,v.sku,v.status,p.status product_status,
            s.quantity_available,s.observed_at,
            CASE WHEN s.id IS NULL THEN 'UNKNOWN' WHEN s.quality='INFERRED' THEN 'UNCERTAIN'
              WHEN s.quantity_available=0 THEN 'KNOWN_STOCKOUT' ELSE 'AVAILABLE' END stock_state,
            coalesce(s.observed_at<CAST(:end AS timestamptz)-interval '24 hours',false) stale
          FROM product_variants v JOIN products p ON p.id=v.product_id
          LEFT JOIN LATERAL (SELECT * FROM inventory_snapshots s WHERE s.variant_id=v.id AND s.observed_at<:end
            ORDER BY s.observed_at DESC,s.id DESC LIMIT 1) s ON true
        )
        """;
    public Inventory inventory(Range range,MapSqlParameterSource p,int page,int size) {
        StockSummary summary=jdbc.queryForObject(STOCK+"""
            SELECT count(*) variants,count(*) FILTER(WHERE stock_state='KNOWN_STOCKOUT') stockouts,
            count(*) FILTER(WHERE stock_state='UNKNOWN') unknown,count(*) FILTER(WHERE stock_state='UNCERTAIN') uncertain,
            count(*) FILTER(WHERE stale) stale FROM stock
            """,p,(rs,n)->new StockSummary(rs.getLong("variants"),rs.getLong("stockouts"),rs.getLong("unknown"),rs.getLong("uncertain"),rs.getLong("stale")));
        p.addValue("size",size).addValue("offset",(long)page*size);
        var content=jdbc.query(STOCK+" SELECT * FROM stock ORDER BY lower(product_name),lower(name),sku,variant_id LIMIT :size OFFSET :offset",p,
                (rs,n)->new Stock(rs.getObject("product_id",UUID.class),rs.getObject("variant_id",UUID.class),rs.getString("product_name"),rs.getString("name"),rs.getString("sku"),rs.getString("status"),rs.getString("product_status"),
                        (Integer)rs.getObject("quantity_available"),rs.getTimestamp("observed_at")==null?null:rs.getTimestamp("observed_at").toInstant(),rs.getString("stock_state"),rs.getBoolean("stale")));
        return new Inventory(range,range.endDate().atStartOfDay(ZoneOffset.UTC).toInstant(),24,summary,new PageView<>(content,page,size,summary.variants(),(int)((summary.variants()+size-1)/size)));
    }
    private Metrics metrics(ResultSet rs) throws SQLException {
        if(rs.getBigDecimal("gross")==null) return AnalyticsRules.empty();
        return AnalyticsRules.metrics(rs.getBigDecimal("gross"),rs.getBigDecimal("refunded"),rs.getLong("units"),rs.getLong("returned"),rs.getLong("orders"),rs.getLong("lines"),rs.getLong("known_lines"),rs.getLong("refund_events"),rs.getLong("known_refund_events"),rs.getBigDecimal("known_sales"),rs.getBigDecimal("known_refunds"),rs.getBigDecimal("sold_cost"));
    }
}
