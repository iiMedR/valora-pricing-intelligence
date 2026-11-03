package com.smartpricing.demo.repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.sql.*;
import java.util.*;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.*;
import org.springframework.stereotype.Repository;

@Repository
@Profile("demo")
public class DemoChecksum {
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    public DemoChecksum(JdbcTemplate jdbc,ObjectMapper mapper) { this.jdbc=jdbc; this.mapper=mapper; }

    public String calculate() {
        try {
            MessageDigest digest=MessageDigest.getInstance("SHA-256");
            rows(digest,"settings","SELECT display_name,currency_code FROM business_settings ORDER BY id");
            rows(digest,"categories","SELECT name,description FROM categories ORDER BY name");
            rows(digest,"products","SELECT p.name,p.description,c.name AS category,p.status FROM products p LEFT JOIN categories c ON p.category_id=c.id ORDER BY p.name");
            rows(digest,"variants","SELECT v.sku,v.name,p.name AS product,v.cost_price,v.current_price,v.min_price,v.max_price,v.status FROM product_variants v JOIN products p ON p.id=v.product_id ORDER BY v.sku");
            for(String kind:List.of("price","cost")) rows(digest,kind,"SELECT v.sku,h.amount,h.currency_code,h.valid_from,h.valid_to,h.source,h.quality,h.external_reference FROM variant_"+kind+"_history h JOIN product_variants v ON v.id=h.variant_id ORDER BY v.sku,h.valid_from,h.external_reference");
            rows(digest,"inventory","SELECT v.sku,h.observed_at,h.quantity_available,h.source,h.quality,h.external_reference FROM inventory_snapshots h JOIN product_variants v ON v.id=h.variant_id ORDER BY v.sku,h.observed_at,h.external_reference");
            rows(digest,"orders","SELECT source,external_reference,placed_at,source_updated_at,status,currency_code,subtotal,discount_amount,shipping_amount,tax_amount FROM sales_orders ORDER BY source,external_reference");
            rows(digest,"items","SELECT o.source,o.external_reference,i.source_line_reference,i.sku_snapshot,i.name_snapshot,i.quantity,i.currency_code,i.list_unit_price,i.unit_price,i.discount_amount,i.line_net,i.unit_cost,i.cost_provenance FROM sales_order_items i JOIN sales_orders o ON o.id=i.order_id ORDER BY o.source,o.external_reference,i.source_line_reference,i.sku_snapshot");
            rows(digest,"refunds","SELECT r.source,r.external_reference,o.source AS order_source,o.external_reference AS order_reference,i.sku_snapshot,r.refunded_at,r.kind,r.quantity,r.amount,r.currency_code,r.reason FROM sales_refunds r JOIN sales_orders o ON o.id=r.order_id LEFT JOIN sales_order_items i ON i.id=r.item_id ORDER BY r.source,r.external_reference");
            rows(digest,"mappings","SELECT m.logical_key,m.entity_kind,m.scenario_id,coalesce(c.name,p.name,v.sku) AS mapped_name FROM demo_control.catalog_mappings m LEFT JOIN categories c ON m.entity_kind='CATEGORY' AND c.id=m.entity_id LEFT JOIN products p ON m.entity_kind='PRODUCT' AND p.id=m.entity_id LEFT JOIN product_variants v ON m.entity_kind='VARIANT' AND v.id=m.entity_id ORDER BY m.logical_key");
            return HexFormat.of().formatHex(digest.digest());
        } catch(NoSuchAlgorithmException exception) { throw new IllegalStateException(exception); }
    }

    private void rows(MessageDigest digest,String label,String sql) {
        digest.update((label+"\n").getBytes(StandardCharsets.UTF_8));
        jdbc.query(connection -> { var statement=connection.prepareStatement(sql); statement.setFetchSize(256); return statement; },
                (RowCallbackHandler) result -> {
                    List<String> values=new ArrayList<>();
                    for(int column=1;column<=result.getMetaData().getColumnCount();column++) {
                        Object value=result.getObject(column);
                        if(value instanceof java.sql.Timestamp time) values.add(time.toInstant().toString());
                        else if(value instanceof java.time.OffsetDateTime time) values.add(time.toInstant().toString());
                        else if(value instanceof BigDecimal decimal) values.add(decimal.setScale(4).toPlainString());
                        else values.add(value==null?null:value.toString());
                    }
                    try { digest.update(mapper.writeValueAsBytes(values)); digest.update((byte)'\n'); }
                    catch(JsonProcessingException exception) { throw new IllegalStateException(exception); }
                });
    }
}
