package com.smartpricing.catalog.repository;

import com.smartpricing.catalog.entity.*;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VariantRepository extends JpaRepository<ProductVariant, UUID> {
    List<ProductVariant> findByProductIdOrderByCreatedAtAscIdAsc(UUID productId);
    Optional<ProductVariant> findByIdAndProductId(UUID id, UUID productId);
    boolean existsBySkuIgnoreCase(String sku);
    boolean existsBySkuIgnoreCaseAndIdNot(String sku, UUID id);
    boolean existsByProductIdAndStatus(UUID productId, CatalogStatus status);
    long countByProductIdAndStatus(UUID productId, CatalogStatus status);
}
