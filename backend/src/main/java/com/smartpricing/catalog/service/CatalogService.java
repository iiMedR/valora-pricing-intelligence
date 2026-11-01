package com.smartpricing.catalog.service;

import com.smartpricing.business.repository.BusinessSettingsRepository;
import com.smartpricing.catalog.dto.CatalogDtos.*;
import com.smartpricing.catalog.entity.*;
import com.smartpricing.catalog.repository.*;
import com.smartpricing.common.ApiException;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.smartpricing.catalog.entity.CatalogStatus.*;

@Service
@Transactional(readOnly = true)
public class CatalogService {
    private final CategoryRepository categories;
    private final ProductRepository products;
    private final VariantRepository variants;
    private final BusinessSettingsRepository settings;

    public CatalogService(CategoryRepository categories, ProductRepository products,
                          VariantRepository variants, BusinessSettingsRepository settings) {
        this.categories = categories;
        this.products = products;
        this.variants = variants;
        this.settings = settings;
    }

    public List<CategoryView> categories() {
        return categories.findAll(Sort.by("name").ascending().and(Sort.by("id"))).stream().map(this::categoryView).toList();
    }

    @Transactional
    public CategoryView createCategory(CategoryWrite input) {
        String name = CatalogRules.text(input.name(), 2, 100, "Category name");
        if (categories.existsByNameIgnoreCase(name)) throw duplicateCategory();
        Category entity = new Category();
        entity.setName(name);
        entity.setDescription(input.description());
        return categoryView(categories.saveAndFlush(entity));
    }

    @Transactional
    public CategoryView updateCategory(UUID id, CategoryWrite input) {
        Category entity = category(id);
        entity.checkVersion(input.version());
        String name = CatalogRules.text(input.name(), 2, 100, "Category name");
        if (categories.existsByNameIgnoreCaseAndIdNot(name, id)) throw duplicateCategory();
        entity.setName(name);
        entity.setDescription(input.description());
        return categoryView(categories.saveAndFlush(entity));
    }

    @Transactional
    public void deleteCategory(UUID id, Long version) {
        Category entity = category(id);
        if (version != null) entity.checkVersion(version);
        if (products.existsByCategoryId(id)) {
            throw ApiException.conflict("CATEGORY_IN_USE", "This category is used by products. Reassign those products before deleting it.");
        }
        categories.delete(entity);
        categories.flush();
    }

    public PageView<ProductView> products(int page, int size, String search, UUID categoryId, CatalogStatus status) {
        if (page < 0 || size < 1 || size > 100) throw ApiException.invalid("Page must be nonnegative and size must be between 1 and 100.");
        if (search != null && search.length() > 160) throw ApiException.invalid("Search must be at most 160 characters.");
        Specification<Product> filter = (root, query, cb) -> cb.conjunction();
        if (search != null && !search.isBlank()) {
            String escaped = search.strip().toLowerCase(Locale.ROOT).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
            filter = filter.and((root, query, cb) -> cb.like(cb.lower(root.get("name")), "%" + escaped + "%", '\\'));
        }
        if (categoryId != null) filter = filter.and((root, query, cb) -> cb.equal(root.get("categoryId"), categoryId));
        if (status != null) filter = filter.and((root, query, cb) -> cb.equal(root.get("status"), status));
        Page<Product> result = products.findAll(filter, PageRequest.of(page, size, Sort.by("createdAt").descending().and(Sort.by("id"))));
        return new PageView<>(result.map(this::productView).getContent(), page, size, result.getTotalElements(), result.getTotalPages());
    }

    public ProductDetail detail(UUID id) {
        return new ProductDetail(productView(product(id)), variants.findByProductIdOrderByCreatedAtAscIdAsc(id).stream().map(this::variantView).toList());
    }

    @Transactional
    public ProductView createProduct(ProductWrite input) {
        if (input.status() != null && input.status() != ARCHIVED) {
            throw ApiException.invalid("New products start ARCHIVED. Add an active variant before activating the product.");
        }
        checkCategory(input.categoryId());
        Product entity = new Product();
        entity.setName(CatalogRules.text(input.name(), 2, 160, "Product name"));
        entity.setDescription(input.description());
        entity.setCategoryId(input.categoryId());
        entity.setStatus(ARCHIVED);
        return productView(products.saveAndFlush(entity));
    }

    @Transactional
    public ProductView updateProduct(UUID id, ProductWrite input) {
        Product entity = lockedProduct(id);
        entity.checkVersion(input.version());
        if (input.status() == null) throw ApiException.invalid("Product status is required for updates.");
        checkCategory(input.categoryId());
        if (input.status() == ACTIVE && !variants.existsByProductIdAndStatus(id, ACTIVE)) {
            throw ApiException.conflict("ACTIVE_VARIANT_REQUIRED", "Add an active variant before activating this product.");
        }
        entity.setName(CatalogRules.text(input.name(), 2, 160, "Product name"));
        entity.setDescription(input.description());
        entity.setCategoryId(input.categoryId());
        entity.setStatus(input.status());
        return productView(products.saveAndFlush(entity));
    }

    @Transactional
    public ProductView archiveProduct(UUID id, Long version) {
        Product entity = lockedProduct(id);
        if (version != null) entity.checkVersion(version);
        entity.setStatus(ARCHIVED);
        return productView(products.saveAndFlush(entity));
    }

    @Transactional
    public VariantView createVariant(UUID productId, VariantWrite input) {
        CatalogRules.prices(input);
        // Serialize variant insertion and currency updates on the singleton row.
        settings.lockSingleton();
        lockedProduct(productId);
        String sku = CatalogRules.text(input.sku(), 1, 80, "SKU");
        if (variants.existsBySkuIgnoreCase(sku)) throw duplicateSku();
        ProductVariant entity = new ProductVariant();
        entity.setProductId(productId);
        apply(entity, input, sku);
        return variantView(variants.saveAndFlush(entity));
    }

    @Transactional
    public VariantView updateVariant(UUID productId, UUID variantId, VariantWrite input) {
        CatalogRules.prices(input);
        Product parent = lockedProduct(productId);
        ProductVariant entity = variant(productId, variantId);
        entity.checkVersion(input.version());
        String sku = CatalogRules.text(input.sku(), 1, 80, "SKU");
        if (variants.existsBySkuIgnoreCaseAndIdNot(sku, variantId)) throw duplicateSku();
        apply(entity, input, sku);
        VariantView result = variantView(variants.saveAndFlush(entity));
        archiveParentIfEmpty(parent);
        return result;
    }

    @Transactional
    public VariantView archiveVariant(UUID productId, UUID variantId, Long version) {
        Product parent = lockedProduct(productId);
        ProductVariant entity = variant(productId, variantId);
        if (version != null) entity.checkVersion(version);
        entity.setStatus(ARCHIVED);
        VariantView result = variantView(variants.saveAndFlush(entity));
        archiveParentIfEmpty(parent);
        return result;
    }

    private void archiveParentIfEmpty(Product parent) {
        if (parent.getStatus() == ACTIVE && !variants.existsByProductIdAndStatus(parent.getId(), ACTIVE)) {
            parent.setStatus(ARCHIVED);
            products.saveAndFlush(parent);
        }
    }

    private void apply(ProductVariant entity, VariantWrite input, String sku) {
        entity.setSku(sku);
        entity.setName(CatalogRules.text(input.name(), 1, 120, "Variant name"));
        entity.setCostPrice(input.costPrice()); entity.setCurrentPrice(input.currentPrice());
        entity.setMinPrice(input.minPrice()); entity.setMaxPrice(input.maxPrice()); entity.setStatus(input.status());
    }

    private Category category(UUID id) { return categories.findById(id).orElseThrow(() -> ApiException.missing("Category")); }
    private void checkCategory(UUID id) { if (id != null) category(id); }
    private Product product(UUID id) { return products.findById(id).orElseThrow(() -> ApiException.missing("Product")); }
    private Product lockedProduct(UUID id) { return products.findLockedById(id).orElseThrow(() -> ApiException.missing("Product")); }
    private ProductVariant variant(UUID productId, UUID id) {
        return variants.findByIdAndProductId(id, productId).orElseThrow(() -> ApiException.missing("Variant in this product"));
    }
    private ApiException duplicateCategory() { return ApiException.conflict("DUPLICATE_CATEGORY", "A category with this name already exists (case-insensitive)."); }
    private ApiException duplicateSku() { return ApiException.conflict("DUPLICATE_SKU", "This SKU already exists, including archived variants (case-insensitive)."); }

    private CategoryView categoryView(Category entity) {
        return new CategoryView(entity.getId(), entity.getName(), entity.getDescription(), entity.getCreatedAt(), entity.getUpdatedAt(), entity.getVersion());
    }
    private ProductView productView(Product entity) {
        return new ProductView(entity.getId(), entity.getName(), entity.getDescription(), entity.getCategoryId(), entity.getStatus(), entity.getCreatedAt(), entity.getUpdatedAt(), entity.getVersion());
    }
    private VariantView variantView(ProductVariant entity) {
        return new VariantView(entity.getId(), entity.getProductId(), entity.getSku(), entity.getName(), entity.getCostPrice().toPlainString(),
                entity.getCurrentPrice().toPlainString(), entity.getMinPrice().toPlainString(), entity.getMaxPrice().toPlainString(), entity.getStatus(),
                entity.getCurrentPrice().compareTo(entity.getCostPrice()) < 0, entity.getCreatedAt(), entity.getUpdatedAt(), entity.getVersion());
    }
}
