package com.smartpricing.common;

import jakarta.persistence.*;
import java.time.Instant;

@MappedSuperclass
public abstract class AuditedEntity {
    @Column(nullable = false, updatable = false)
    private Instant createdAt;
    @Column(nullable = false)
    private Instant updatedAt;
    @Version
    private long version;

    @PrePersist
    protected void created() { createdAt = updatedAt = Instant.now(); }
    @PreUpdate
    protected void updated() { updatedAt = Instant.now(); }

    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public long getVersion() { return version; }

    public void checkVersion(Long expected) {
        if (expected == null) throw ApiException.invalid("Version is required for updates.");
        if (expected != version) {
            throw ApiException.conflict("STALE_VERSION", "This record changed. Reload it before saving again.");
        }
    }
}
