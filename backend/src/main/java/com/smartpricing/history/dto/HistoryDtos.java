package com.smartpricing.history.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public final class HistoryDtos {
    private HistoryDtos() {}
    public enum Source { MANUAL, SHOPIFY, DEMO }
    public enum Quality { VERIFIED_CHANGE, SNAPSHOT, INFERRED }
    public enum PeriodKind { PRICE, COST }
    public record PeriodWrite(@NotNull BigDecimal amount, @NotBlank String currencyCode,
            @NotNull Instant validFrom, Instant validTo, @NotNull Source source, @NotNull Quality quality,
            @Size(max=160) String externalReference, @PositiveOrZero Long variantVersion) {}
    public record PeriodView(UUID id, UUID variantId, String amount, String currencyCode, Instant validFrom,
            Instant validTo, Source source, Quality quality, String externalReference, Instant createdAt) {}
    public record InventoryWrite(@NotNull Instant observedAt, @NotNull @PositiveOrZero Integer quantityAvailable,
            @NotNull Source source, @NotNull Quality quality, @Size(max=160) String externalReference) {}
    public record InventoryView(UUID id, UUID variantId, Instant observedAt, int quantityAvailable, Source source,
            Quality quality, String externalReference, String stockState, Instant createdAt) {}
    public record WriteResult<T>(T value, boolean created) {}
}
