package com.smartpricing.optimization.repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.sql.Timestamp;
import java.util.*;
import org.springframework.jdbc.core.namedparam.*;
import org.springframework.stereotype.Repository;

@Repository
public class OptimizationRepository {
    private final NamedParameterJdbcTemplate jdbc;
    public OptimizationRepository(NamedParameterJdbcTemplate jdbc){this.jdbc=jdbc;}
    public record Market(BigDecimal min,BigDecimal max,BigDecimal price,BigDecimal cost,Instant priceFrom,Instant costFrom,
            Integer stock,Instant stockAt,String stockQuality) {}
    public Map<UUID,Market> inputs(List<UUID> ids,Instant at,String currency) {
        Map<UUID,Market> result=new HashMap<>();if(ids.isEmpty())return result;
        var params=new MapSqlParameterSource("ids",ids).addValue("at",Timestamp.from(at)).addValue("currency",currency);
        jdbc.query("""
            SELECT v.id,v.min_price,v.max_price,p.amount price,c.amount cost,p.valid_from price_from,c.valid_from cost_from,
              s.quantity_available,s.observed_at,s.quality
            FROM product_variants v
            LEFT JOIN LATERAL (SELECT amount,valid_from FROM variant_price_history WHERE variant_id=v.id AND quality='VERIFIED_CHANGE'
              AND currency_code=:currency AND valid_from<=:at AND (valid_to IS NULL OR valid_to>:at) ORDER BY valid_from DESC LIMIT 1) p ON true
            LEFT JOIN LATERAL (SELECT amount,valid_from FROM variant_cost_history WHERE variant_id=v.id AND quality='VERIFIED_CHANGE'
              AND currency_code=:currency AND valid_from<=:at AND (valid_to IS NULL OR valid_to>:at) ORDER BY valid_from DESC LIMIT 1) c ON true
            LEFT JOIN LATERAL (SELECT quantity_available,observed_at,quality FROM inventory_snapshots WHERE variant_id=v.id AND observed_at<=:at ORDER BY observed_at DESC,id DESC LIMIT 1) s ON true
            WHERE v.id IN (:ids)
            """,params,(org.springframework.jdbc.core.RowCallbackHandler)rs->result.put(rs.getObject("id",UUID.class),new Market(rs.getBigDecimal("min_price"),rs.getBigDecimal("max_price"),rs.getBigDecimal("price"),rs.getBigDecimal("cost"),time(rs.getTimestamp("price_from")),time(rs.getTimestamp("cost_from")),(Integer)rs.getObject("quantity_available"),time(rs.getTimestamp("observed_at")),rs.getString("quality"))));
        return result;
    }
    private Instant time(Timestamp value){return value==null?null:value.toInstant();}
}
