package com.smartpricing.catalog.dto;

import com.smartpricing.catalog.entity.CatalogStatus;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

public final class CatalogDtos {
    private CatalogDtos() {}
    public record CategoryWrite(@NotBlank @Size(min = 2, max = 100) String name,
                                @Size(max = 500) String description, @PositiveOrZero Long version) {}
    public record CategoryView(UUID id, String name, String description, Instant createdAt, Instant updatedAt, long version) {}
    public record ProductWrite(@NotBlank @Size(min = 2, max = 160) String name,
                               @Size(max = 2000) String description, UUID categoryId,
                               CatalogStatus status, @PositiveOrZero Long version) {}
    public record ProductView(UUID id, String name, String description, UUID categoryId, CatalogStatus status,
                              Instant createdAt, Instant updatedAt, long version) {}
    public record ProductDetail(ProductView product, List<VariantView> variants) {}
    public record PageView<T>(List<T> content, int page, int size, long totalElements, int totalPages) {}
    public record VariantWrite(@NotBlank @Size(max = 80) String sku,
                               @NotBlank @Size(max = 120) String name,
                               @NotNull @DecimalMin("0") @Digits(integer = 15, fraction = 4) BigDecimal costPrice,
                               @NotNull @DecimalMin(value = "0", inclusive = false) @Digits(integer = 15, fraction = 4) BigDecimal currentPrice,
                               @NotNull @DecimalMin(value = "0", inclusive = false) @Digits(integer = 15, fraction = 4) BigDecimal minPrice,
                               @NotNull @DecimalMin(value = "0", inclusive = false) @Digits(integer = 15, fraction = 4) BigDecimal maxPrice,
                               @NotNull CatalogStatus status, @PositiveOrZero Long version) {}
    // Decimal strings preserve all NUMERIC(19,4) digits in JavaScript clients.
    public record VariantView(UUID id, UUID productId, String sku, String name, String costPrice,
                              String currentPrice, String minPrice, String maxPrice, CatalogStatus status,
                              boolean belowCost, Instant createdAt, Instant updatedAt, long version) {}
}
