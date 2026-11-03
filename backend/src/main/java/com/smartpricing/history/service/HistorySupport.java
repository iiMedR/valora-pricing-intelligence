package com.smartpricing.history.service;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import com.smartpricing.common.ApiException;
import com.smartpricing.history.dto.HistoryDtos.Source;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class HistorySupport {
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final com.smartpricing.demo.config.DemoSafetyGuard demoGuard;
    public HistorySupport(JdbcTemplate jdbc,ObjectMapper mapper,com.smartpricing.demo.config.DemoSafetyGuard demoGuard) {
        this.jdbc=jdbc; this.mapper=mapper; this.demoGuard=demoGuard;
    }
    public String fingerprint(Object input) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(canonical(mapper.valueToTree(input)).toString().getBytes(StandardCharsets.UTF_8))); }
        catch(NoSuchAlgorithmException exception) { throw new IllegalStateException(exception); }
    }
    private JsonNode canonical(JsonNode node) {
        if(node.isNumber()) return TextNode.valueOf(node.decimalValue().stripTrailingZeros().toPlainString());
        if(node.isObject()) {
            ObjectNode result=mapper.createObjectNode();
            var names=new TreeSet<String>(); node.fieldNames().forEachRemaining(names::add);
            names.forEach(name -> result.set(name,canonical(node.get(name)))); return result;
        }
        if(node.isArray()) { ArrayNode result=mapper.createArrayNode(); node.forEach(value -> result.add(canonical(value))); return result; }
        return node;
    }
    public void lockKey(String type,Source source,String reference) {
        if(source==Source.DEMO) demoGuard.requireVerifiedDemo();
        HistoryRules.reference(source,reference);
        if(reference!=null) {
            try {
                byte[] bytes=MessageDigest.getInstance("SHA-256").digest((type+":"+source+":"+reference).getBytes(StandardCharsets.UTF_8));
                // Bound lock-table usage for atomic bulk ingestion. Hash collisions only serialize unrelated keys;
                // exact source/reference unique constraints and payload fingerprints still determine idempotency.
                long stripe=0x53504B4559000000L | (ByteBuffer.wrap(bytes).getLong() & 1023L);
                jdbc.queryForList("SELECT pg_advisory_xact_lock(?)",stripe);
            } catch(NoSuchAlgorithmException exception) { throw new IllegalStateException(exception); }
        }
    }
    public void samePayload(String existing,String incoming) {
        if(!existing.equals(incoming)) throw ApiException.conflict("SOURCE_KEY_CONFLICT","This source reference already exists with a different payload.");
    }
    public void currency(String currency) {
        String configured=jdbc.queryForObject("SELECT currency_code FROM business_settings WHERE id=1",String.class);
        if(!Objects.equals(configured,currency)) throw ApiException.invalid("Currency must match the configured business currency: "+configured+".");
    }
    public void lockVariant(UUID id) {
        // Match catalog lock order: parent product, then variant. Do not lock unrelated variants.
        var parents=jdbc.queryForList("SELECT product_id FROM product_variants WHERE id=?",UUID.class,id);
        if(parents.isEmpty()) throw ApiException.missing("Variant");
        jdbc.queryForList("SELECT id FROM products WHERE id=? FOR UPDATE",parents.getFirst());
        jdbc.queryForList("SELECT id FROM product_variants WHERE id=? FOR UPDATE",id);
    }
}
