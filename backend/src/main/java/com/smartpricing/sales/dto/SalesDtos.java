package com.smartpricing.sales.dto;

import com.smartpricing.history.dto.HistoryDtos.Source;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

public final class SalesDtos {
    private SalesDtos() {}
    public enum OrderStatus { COMPLETED, UNPAID, CANCELLED }
    public enum RefundKind { LINE_RETURN, FINANCIAL_ADJUSTMENT, SHIPPING, TAX }
    public record LineWrite(@NotNull UUID variantId, @Min(1) @Max(1000000) int quantity,
            BigDecimal listUnitPrice, @NotNull BigDecimal unitPrice, @NotNull BigDecimal discountAmount,
            BigDecimal unitCost, @Size(max=160) String sourceLineReference) {}
    public record OrderWrite(@NotNull Source source, @Size(max=160) String externalReference,
            @NotNull Instant placedAt, Instant sourceUpdatedAt, @NotNull OrderStatus status,
            @NotBlank String currencyCode, BigDecimal shippingAmount, BigDecimal taxAmount,
            @NotNull @Size(min=1,max=100) List<@NotNull @Valid LineWrite> lines) {}
    public record RefundWrite(@NotNull Source source, @Size(max=160) String externalReference,
            @NotNull Instant refundedAt, @NotNull RefundKind kind, UUID itemId,
            @PositiveOrZero int quantity, @NotNull BigDecimal amount, @NotBlank String currencyCode,
            @Size(max=500) String reason) {}
    public record OrderView(UUID id, Source source, String externalReference, Instant placedAt, Instant sourceUpdatedAt,
            OrderStatus status, String currencyCode, String subtotal, String discountAmount, String shippingAmount,
            String taxAmount, String merchandiseRefunds, String shippingRefunds, String taxRefunds,
            String netMerchandise, String recognizedNetMerchandise, String totalCharged, int itemCount, int totalQuantity,
            Instant createdAt, Instant updatedAt) {}
    public record LineView(UUID id, UUID variantId, String sku, String name, int quantity, String currencyCode,
            String listUnitPrice, String unitPrice, String discountAmount, String lineNet, String unitCost,
            String costProvenance, String sourceLineReference) {}
    public record RefundView(UUID id, UUID orderId, UUID itemId, Source source, String externalReference,
            Instant refundedAt, RefundKind kind, int quantity, String amount, String currencyCode, String reason, Instant createdAt) {}
    public record OrderDetail(OrderView order, List<LineView> lines, List<RefundView> refunds) {}
}
