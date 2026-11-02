package com.smartpricing.catalog;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class CatalogApiIT {
    @Container @ServiceConnection static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17.7-alpine");
    @Autowired TestRestTemplate rest;
    @Autowired JdbcTemplate jdbc;

    @BeforeEach void cleanIsolatedTestDatabase() {
        jdbc.update("DELETE FROM product_variants"); jdbc.update("DELETE FROM products"); jdbc.update("DELETE FROM categories");
        jdbc.update("UPDATE business_settings SET display_name='My Business', currency_code='MAD', version=0 WHERE id=1");
    }

    ResponseEntity<JsonNode> call(HttpMethod method, String path, Object body) {
        return rest.exchange("/api/v1" + path, method, new HttpEntity<>(body), JsonNode.class);
    }
    JsonNode create(String path, Object body) {
        var response = call(HttpMethod.POST, path, body);
        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(response.getHeaders().getLocation()).isNotNull();
        return response.getBody();
    }
    JsonNode product() { return create("/products", Map.of("name", "Test Product")); }
    Map<String, Object> variant(String sku) {
        return new HashMap<>(Map.of("sku", sku, "name", "Standard", "costPrice", "12.1234", "currentPrice", "10.1234",
                "minPrice", "5.0000", "maxPrice", "20.0000", "status", "ACTIVE"));
    }

    @Test void cleanMigrationAndDatabaseConstraints() {
        assertThat(jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history WHERE success AND version IN ('1','2')", Integer.class)).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM business_settings", Integer.class)).isEqualTo(1);
        assertThatThrownBy(() -> jdbc.update("INSERT INTO business_settings(id,display_name,currency_code) VALUES (2,'Other','USD')")).isInstanceOf(DataIntegrityViolationException.class);
        UUID category = UUID.randomUUID();
        jdbc.update("INSERT INTO categories(id,name) VALUES (?, 'Shoes')", category);
        assertThatThrownBy(() -> jdbc.update("INSERT INTO categories(id,name) VALUES (?, 'sHoEs')", UUID.randomUUID())).isInstanceOf(DataIntegrityViolationException.class);
        UUID productId = UUID.randomUUID();
        jdbc.update("INSERT INTO products(id,name,category_id) VALUES (?, 'Test', ?)", productId, category);
        assertThatThrownBy(() -> jdbc.update("DELETE FROM categories WHERE id=?", category)).isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbc.update("INSERT INTO products(id,name,category_id) VALUES (?, 'Test', ?)", UUID.randomUUID(), UUID.randomUUID())).isInstanceOf(DataIntegrityViolationException.class);
        UUID variantId = UUID.randomUUID();
        jdbc.update("INSERT INTO product_variants(id,product_id,sku,name,cost_price,current_price,min_price,max_price) VALUES (?,?,'SKU','Standard',0,10,5,20)", variantId, productId);
        assertThatThrownBy(() -> jdbc.update("UPDATE product_variants SET min_price=11 WHERE id=?", variantId)).isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbc.update("UPDATE product_variants SET cost_price=-1 WHERE id=?", variantId)).isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbc.update("DELETE FROM products WHERE id=?", productId)).isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbc.update("INSERT INTO product_variants(id,product_id,sku,name,cost_price,current_price,min_price,max_price) VALUES (?,?,'sku','Other',0,10,5,20)", UUID.randomUUID(), productId)).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test void productVariantLifecycleAndArchivePreservesRecords() {
        JsonNode category = create("/categories", Map.of("name", "Accessories"));
        JsonNode product = create("/products", Map.of("name", "Test Product", "categoryId", category.path("id").asText()));
        String path = "/products/" + product.path("id").asText();
        assertThat(product.path("status").asText()).isEqualTo("ARCHIVED");
        JsonNode variant = create(path + "/variants", variant("SKU-1"));
        assertThat(variant.path("belowCost").asBoolean()).isTrue();
        assertThat(variant.path("currentPrice").isTextual()).isTrue();
        assertThat(variant.path("currentPrice").asText()).isEqualTo("10.1234");
        var updated = call(HttpMethod.PUT, path, Map.of("name", "Updated Product", "categoryId", category.path("id").asText(), "status", "ACTIVE", "version", product.path("version").asLong()));
        assertThat(updated.getStatusCode().value()).isEqualTo(200);
        var edit = variant("sku-1"); edit.put("version", variant.path("version").asLong()); edit.put("currentPrice", "15.2500");
        String variantPath = path + "/variants/" + variant.path("id").asText();
        JsonNode saved = call(HttpMethod.PUT, variantPath, edit).getBody();
        assertThat(saved.path("currentPrice").asText()).isEqualTo("15.2500");
        assertThat(call(HttpMethod.DELETE, variantPath + "?version=" + saved.path("version").asLong(), null).getStatusCode().value()).isEqualTo(200);
        JsonNode detail = call(HttpMethod.GET, path, null).getBody();
        assertThat(detail.path("product").path("status").asText()).isEqualTo("ARCHIVED");
        assertThat(detail.path("variants").get(0).path("status").asText()).isEqualTo("ARCHIVED");
        assertThat(call(HttpMethod.DELETE, path, null).getStatusCode().value()).isEqualTo(200);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM product_variants", Integer.class)).isEqualTo(1);
        assertThat(call(HttpMethod.DELETE, "/categories/" + category.path("id").asText(), null).getStatusCode().value()).isEqualTo(409);
    }

    @Test void validationUniquenessAndMissingRecords() {
        JsonNode product = product(); String path = "/products/" + product.path("id").asText();
        create(path + "/variants", variant("Sku-1"));
        assertThat(call(HttpMethod.POST, path + "/variants", variant("sKU-1")).getBody().path("code").asText()).isEqualTo("DUPLICATE_SKU");
        for (String value : List.of("0", "21", "1.00001", "1000000000000000")) {
            var body = variant("SKU-2"); body.put("currentPrice", value);
            var response = call(HttpMethod.POST, path + "/variants", body);
            assertThat(response.getStatusCode().value()).isEqualTo(400);
            assertThat(response.getBody().has("timestamp")).isTrue();
        }
        assertThat(call(HttpMethod.GET, "/products/" + UUID.randomUUID(), null).getStatusCode().value()).isEqualTo(404);
        assertThat(call(HttpMethod.POST, "/products", Map.of("name", "Test", "categoryId", UUID.randomUUID())).getStatusCode().value()).isEqualTo(404);
        assertThat(call(HttpMethod.GET, "/products?status=INVALID", null).getStatusCode().value()).isEqualTo(400);
        assertThat(call(HttpMethod.POST, "/products", Map.of("name", "Test", "status", 1)).getStatusCode().value()).isEqualTo(400);
        assertThat(call(HttpMethod.POST, "/categories", Map.of("name", " ")).getBody().path("fieldErrors").has("name")).isTrue();
    }

    @Test void filtersPaginationStateTransitionsAndStaleEdits() {
        JsonNode category = create("/categories", Map.of("name", "Accessories"));
        JsonNode first = create("/products", Map.of("name", "Blue Shirt", "categoryId", category.path("id").asText()));
        product();
        JsonNode results = call(HttpMethod.GET, "/products?search=blue&status=ARCHIVED&categoryId=" + category.path("id").asText() + "&size=1", null).getBody();
        assertThat(results.path("totalElements").asInt()).isEqualTo(1);
        assertThat(results.path("content").get(0).path("id").asText()).isEqualTo(first.path("id").asText());
        assertThat(call(HttpMethod.GET, "/products?size=101", null).getStatusCode().value()).isEqualTo(400);
        assertThat(call(HttpMethod.GET, "/products?page=1&size=1", null).getBody().path("content").size()).isEqualTo(1);
        String path = "/products/" + first.path("id").asText();
        assertThat(call(HttpMethod.PUT, path, Map.of("name", "Test", "status", "ACTIVE", "version", 0)).getBody().path("code").asText()).isEqualTo("ACTIVE_VARIANT_REQUIRED");
        assertThat(call(HttpMethod.PUT, path, Map.of("name", "Updated", "status", "ARCHIVED", "version", 0)).getStatusCode().value()).isEqualTo(200);
        assertThat(call(HttpMethod.PUT, path, Map.of("name", "Stale", "status", "ARCHIVED", "version", 0)).getBody().path("code").asText()).isEqualTo("STALE_VERSION");
        JsonNode other = product();
        JsonNode variant = create(path + "/variants", variant("SKU"));
        assertThat(call(HttpMethod.PUT, "/products/" + other.path("id").asText() + "/variants/" + variant.path("id").asText(), variant("SKU")).getStatusCode().value()).isEqualTo(404);
    }

    @Test void businessSettingsAndCategoryEdits() {
        assertThat(call(HttpMethod.PUT, "/business-settings", Map.of("displayName", "New Business", "currencyCode", "USD", "version", 0)).getStatusCode().value()).isEqualTo(200);
        assertThat(call(HttpMethod.PUT, "/business-settings", Map.of("displayName", "New Business", "currencyCode", "ZZZ", "version", 1)).getStatusCode().value()).isEqualTo(400);
        JsonNode p = product(); create("/products/" + p.path("id").asText() + "/variants", variant("SKU"));
        assertThat(call(HttpMethod.PUT, "/business-settings", Map.of("displayName", "New Business", "currencyCode", "MAD", "version", 1)).getBody().path("code").asText()).isEqualTo("CURRENCY_LOCKED");
        JsonNode c = create("/categories", Map.of("name", "Shoes"));
        assertThat(call(HttpMethod.POST, "/categories", Map.of("name", "sHOES")).getStatusCode().value()).isEqualTo(409);
        JsonNode changed = call(HttpMethod.PUT, "/categories/" + c.path("id").asText(), Map.of("name", "Footwear", "version", 0)).getBody();
        assertThat(changed.path("version").asInt()).isEqualTo(1);
        assertThat(call(HttpMethod.DELETE, "/categories/" + c.path("id").asText() + "?version=1", null).getStatusCode().value()).isEqualTo(204);
    }
}
