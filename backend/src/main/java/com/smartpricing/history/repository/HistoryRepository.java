package com.smartpricing.history.repository;

import com.smartpricing.catalog.dto.CatalogDtos.PageView;
import com.smartpricing.history.dto.HistoryDtos.*;
import java.sql.*;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.*;
import org.springframework.stereotype.Repository;

@Repository
public class HistoryRepository {
    private final JdbcTemplate jdbc;
    public HistoryRepository(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    public String table(PeriodKind kind) { return kind==PeriodKind.PRICE ? "variant_price_history" : "variant_cost_history"; }
    public record Existing(UUID id,String payloadHash,UUID variantId) {}
    public Existing existing(String table, Source source,String reference) {
        if(reference==null) return null;
        var result=jdbc.query("SELECT id,payload_hash,variant_id FROM "+table+" WHERE source=? AND external_reference=?",
                (rs,n)->new Existing(rs.getObject("id",UUID.class),rs.getString("payload_hash"),rs.getObject("variant_id",UUID.class)),source.name(),reference);
        return result.isEmpty()?null:result.getFirst();
    }
    public PeriodView period(PeriodKind kind,UUID id) { return jdbc.queryForObject("SELECT * FROM "+table(kind)+" WHERE id=?",this::periodRow,id); }
    public InventoryView inventory(UUID id) { return jdbc.queryForObject("SELECT * FROM inventory_snapshots WHERE id=?",this::inventoryRow,id); }
    public void assertVariant(UUID id) {
        if(jdbc.queryForObject("SELECT count(*) FROM product_variants WHERE id=?",Integer.class,id)==0) throw com.smartpricing.common.ApiException.missing("Variant");
    }
    public PageView<PeriodView> periods(PeriodKind kind,UUID variant,int page,int size) {
        assertVariant(variant);
        long count=jdbc.queryForObject("SELECT count(*) FROM "+table(kind)+" WHERE variant_id=?",Long.class,variant);
        var rows=jdbc.query("SELECT * FROM "+table(kind)+" WHERE variant_id=? ORDER BY valid_from DESC,id LIMIT ? OFFSET ?",this::periodRow,variant,size,(long)page*size);
        return new PageView<>(rows,page,size,count,(int)((count+size-1)/size));
    }
    public PageView<InventoryView> inventory(UUID variant,int page,int size) {
        assertVariant(variant);
        long count=jdbc.queryForObject("SELECT count(*) FROM inventory_snapshots WHERE variant_id=?",Long.class,variant);
        var rows=jdbc.query("SELECT * FROM inventory_snapshots WHERE variant_id=? ORDER BY observed_at DESC,id LIMIT ? OFFSET ?",this::inventoryRow,variant,size,(long)page*size);
        return new PageView<>(rows,page,size,count,(int)((count+size-1)/size));
    }
    private PeriodView periodRow(ResultSet rs,int row) throws SQLException {
        return new PeriodView(rs.getObject("id",UUID.class),rs.getObject("variant_id",UUID.class),rs.getBigDecimal("amount").toPlainString(),
                rs.getString("currency_code"),time(rs,"valid_from"),time(rs,"valid_to"),Source.valueOf(rs.getString("source")),
                Quality.valueOf(rs.getString("quality")),rs.getString("external_reference"),time(rs,"created_at"));
    }
    private InventoryView inventoryRow(ResultSet rs,int row) throws SQLException {
        int quantity=rs.getInt("quantity_available"); Quality quality=Quality.valueOf(rs.getString("quality"));
        return new InventoryView(rs.getObject("id",UUID.class),rs.getObject("variant_id",UUID.class),time(rs,"observed_at"),quantity,
                Source.valueOf(rs.getString("source")),quality,rs.getString("external_reference"),
                com.smartpricing.history.service.HistoryRules.stockState(quantity,quality),time(rs,"created_at"));
    }
    public static Instant time(ResultSet rs,String column) throws SQLException { Timestamp value=rs.getTimestamp(column); return value==null?null:value.toInstant(); }
    public static Timestamp timestamp(Instant instant) { return instant==null?null:Timestamp.from(instant); }
}
