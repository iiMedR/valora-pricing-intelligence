package com.smartpricing.catalog.entity;

import com.smartpricing.common.AuditedEntity;
import jakarta.persistence.*;
import java.util.UUID;
import java.math.BigDecimal;

@Entity
@Table(name = "product_variants")
public class ProductVariant extends AuditedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(nullable = false)
    private UUID productId;
    @Column(nullable = false, length = 80)
    private String sku;
    @Column(nullable = false, length = 120)
    private String name;
    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal costPrice;
    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal currentPrice;
    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal minPrice;
    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal maxPrice;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private CatalogStatus status;
    public UUID getId() { return id; }
    
    public UUID getProductId() { return productId; }
    public void setProductId(UUID productId) { this.productId = productId; }
    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public BigDecimal getCostPrice() { return costPrice; }
    public void setCostPrice(BigDecimal costPrice) { this.costPrice = costPrice; }
    public BigDecimal getCurrentPrice() { return currentPrice; }
    public void setCurrentPrice(BigDecimal currentPrice) { this.currentPrice = currentPrice; }
    public BigDecimal getMinPrice() { return minPrice; }
    public void setMinPrice(BigDecimal minPrice) { this.minPrice = minPrice; }
    public BigDecimal getMaxPrice() { return maxPrice; }
    public void setMaxPrice(BigDecimal maxPrice) { this.maxPrice = maxPrice; }
    public CatalogStatus getStatus() { return status; }
    public void setStatus(CatalogStatus status) { this.status = status; }
}
