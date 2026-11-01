package com.smartpricing.catalog.entity;

import com.smartpricing.common.AuditedEntity;
import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "products")
public class Product extends AuditedEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(nullable = false, length = 160)
    private String name;
    @Column(length = 2000)
    private String description;
    
    private UUID categoryId;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private CatalogStatus status;
    public UUID getId() { return id; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public UUID getCategoryId() { return categoryId; }
    public void setCategoryId(UUID categoryId) { this.categoryId = categoryId; }
    public CatalogStatus getStatus() { return status; }
    public void setStatus(CatalogStatus status) { this.status = status; }
}
