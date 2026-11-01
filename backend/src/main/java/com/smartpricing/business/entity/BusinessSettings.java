package com.smartpricing.business.entity;

import com.smartpricing.common.AuditedEntity;
import jakarta.persistence.*;

@Entity
@Table(name = "business_settings")
public class BusinessSettings extends AuditedEntity {
    @Id
    private Long id;
    @Column(nullable = false, length = 120)
    private String displayName;
    @Column(nullable = false, length = 3)
    private String currencyCode;
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public String getCurrencyCode() { return currencyCode; }
    public void setCurrencyCode(String currencyCode) { this.currencyCode = currencyCode; }
}
