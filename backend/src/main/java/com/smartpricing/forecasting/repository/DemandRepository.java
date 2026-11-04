package com.smartpricing.forecasting.repository;

import com.smartpricing.forecasting.dto.ForecastDtos.*;
import com.smartpricing.common.ApiException;
import com.smartpricing.catalog.dto.CatalogDtos.PageView;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.namedparam.*;
import org.springframework.stereotype.Repository;

@Repository
public class DemandRepository {
    private final NamedParameterJdbcTemplate jdbc;
    public DemandRepository(NamedParameterJdbcTemplate jdbc) { this.jdbc=jdbc; }
    public Identity identity(UUID id) {
        var list=jdbc.query("SELECT v.*,p.name product_name,p.status product_status FROM product_variants v JOIN products p ON p.id=v.product_id WHERE v.id=:id",new MapSqlParameterSource("id",id),
                (rs,n)->new Identity(rs.getObject("id",UUID.class),rs.getObject("product_id",UUID.class),rs.getString("product_name"),rs.getString("name"),rs.getString("sku"),rs.getString("status"),rs.getString("product_status")));
        if(list.isEmpty()) throw ApiException.missing("Variant");return list.getFirst();
    }
    public PageView<Identity> page(int page,int size,String search) {
        var p=new MapSqlParameterSource("search",search).addValue("size",size).addValue("offset",(long)page*size);
        String from=" FROM product_variants v JOIN products p ON p.id=v.product_id WHERE strpos(lower(v.sku||' '||v.name||' '||p.name),lower(:search))>0";
        long count=jdbc.queryForObject("SELECT count(*)"+from,p,Long.class);
        var rows=jdbc.query("SELECT v.*,p.name product_name,p.status product_status"+from+" ORDER BY lower(p.name),v.sku,v.id LIMIT :size OFFSET :offset",p,
                (rs,n)->new Identity(rs.getObject("id",UUID.class),rs.getObject("product_id",UUID.class),rs.getString("product_name"),rs.getString("name"),rs.getString("sku"),rs.getString("status"),rs.getString("product_status")));
        return new PageView<>(rows,page,size,count,(int)((count+size-1)/size));
    }
    public Map<UUID,List<Day>> series(List<UUID> ids,LocalDate start,LocalDate end) {
        Map<UUID,List<Day>> result=new LinkedHashMap<>();ids.forEach(id->result.put(id,new ArrayList<>()));if(ids.isEmpty())return result;
        var p=new MapSqlParameterSource("ids",ids).addValue("start",Timestamp.from(start.atStartOfDay(ZoneOffset.UTC).toInstant())).addValue("end",Timestamp.from(end.atStartOfDay(ZoneOffset.UTC).toInstant()));
        jdbc.query("""
            WITH sales AS (
              SELECT i.variant_id,(o.placed_at AT TIME ZONE 'UTC')::date date,sum(i.quantity) units,sum(i.line_net)/sum(i.quantity) price
              FROM sales_order_items i JOIN sales_orders o ON o.id=i.order_id
              WHERE i.variant_id IN (:ids) AND o.status='COMPLETED' AND o.placed_at>=:start AND o.placed_at<:end GROUP BY 1,2
            ), returns AS (
              SELECT i.variant_id,(r.refunded_at AT TIME ZONE 'UTC')::date date,sum(r.quantity) units
              FROM sales_refunds r JOIN sales_order_items i ON i.id=r.item_id JOIN sales_orders o ON o.id=r.order_id
              WHERE i.variant_id IN (:ids) AND o.status='COMPLETED' AND r.kind='LINE_RETURN' AND r.refunded_at>=:start AND r.refunded_at<:end GROUP BY 1,2
            ), dates AS (SELECT d::date date,(d::date::timestamp AT TIME ZONE 'UTC') at
              FROM generate_series(CAST(:start AS timestamptz) AT TIME ZONE 'UTC',(CAST(:end AS timestamptz) AT TIME ZONE 'UTC')-interval '1 day',interval '1 day') d)
            SELECT v.id,d.date,coalesce(s.units,0) units,coalesce(r.units,0) returned,s.price,lp.amount listed,
              inv.quantity_available stock,inv.quality,inv.observed_at,d.at
            FROM product_variants v CROSS JOIN dates d
            LEFT JOIN sales s ON s.variant_id=v.id AND s.date=d.date LEFT JOIN returns r ON r.variant_id=v.id AND r.date=d.date
            LEFT JOIN LATERAL (SELECT amount FROM variant_price_history h WHERE h.variant_id=v.id AND h.quality='VERIFIED_CHANGE'
              AND h.valid_from<=d.at AND (h.valid_to IS NULL OR h.valid_to>d.at) ORDER BY h.valid_from DESC LIMIT 1) lp ON true
            LEFT JOIN LATERAL (SELECT quantity_available,quality,observed_at FROM inventory_snapshots i WHERE i.variant_id=v.id AND i.observed_at<=d.at
              ORDER BY i.observed_at DESC,i.id DESC LIMIT 1) inv ON true
            WHERE v.id IN (:ids) ORDER BY v.id,d.date
            """,p,(org.springframework.jdbc.core.RowCallbackHandler)rs->{
                long units=rs.getLong("units");Integer stock=(Integer)rs.getObject("stock");
                var observed=rs.getTimestamp("observed_at");var at=rs.getTimestamp("at").toInstant();
                boolean trusted=observed!=null&&!observed.toInstant().isBefore(at.minus(Duration.ofHours(24)))&&!"INFERRED".equals(rs.getString("quality"));
                String availability=!trusted?"UNKNOWN":stock==0?"STOCKOUT":"IN_STOCK";
                boolean censored=trusted&&(stock==0||units>=stock);
                var price=rs.getBigDecimal("price");var listed=rs.getBigDecimal("listed");
                String source=price!=null?"REALIZED_UNIT_WEIGHTED":listed!=null?"VERIFIED_LISTED":"MISSING";
                var effective=price==null?listed:price;
                result.get(rs.getObject("id",UUID.class)).add(new Day(rs.getDate("date").toLocalDate(),units,rs.getLong("returned"),decimal(listed),decimal(effective),source,availability,stock,censored,List.of()));
            });
        return result;
    }
    private String decimal(java.math.BigDecimal value) { return value==null?null:value.setScale(4,java.math.RoundingMode.HALF_UP).toPlainString(); }
}
