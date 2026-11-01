package com.smartpricing.catalog.controller;

import com.smartpricing.catalog.dto.CatalogDtos.*;
import com.smartpricing.catalog.entity.CatalogStatus;
import com.smartpricing.catalog.service.CatalogService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class CatalogController {
    private final CatalogService service;
    public CatalogController(CatalogService service) { this.service = service; }

    @GetMapping("/categories") public List<CategoryView> categories() { return service.categories(); }
    @PostMapping("/categories") public ResponseEntity<CategoryView> createCategory(@Valid @RequestBody CategoryWrite input) {
        CategoryView result = service.createCategory(input);
        return ResponseEntity.created(URI.create("/api/v1/categories")).body(result);
    }
    @PutMapping("/categories/{id}") public CategoryView updateCategory(@PathVariable UUID id, @Valid @RequestBody CategoryWrite input) {
        return service.updateCategory(id, input);
    }
    @DeleteMapping("/categories/{id}") public ResponseEntity<Void> deleteCategory(@PathVariable UUID id, @RequestParam(required = false) Long version) {
        service.deleteCategory(id, version);
        return ResponseEntity.noContent().build();
    }
    @GetMapping("/products") public PageView<ProductView> products(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size, @RequestParam(required = false) String search,
            @RequestParam(required = false) UUID categoryId, @RequestParam(required = false) CatalogStatus status) {
        return service.products(page, size, search, categoryId, status);
    }
    @PostMapping("/products") public ResponseEntity<ProductView> createProduct(@Valid @RequestBody ProductWrite input) {
        ProductView result = service.createProduct(input);
        return ResponseEntity.created(URI.create("/api/v1/products/" + result.id())).body(result);
    }
    @GetMapping("/products/{id}") public ProductDetail detail(@PathVariable UUID id) { return service.detail(id); }
    @PutMapping("/products/{id}") public ProductView updateProduct(@PathVariable UUID id, @Valid @RequestBody ProductWrite input) {
        return service.updateProduct(id, input);
    }
    @DeleteMapping("/products/{id}") public ProductView archiveProduct(@PathVariable UUID id, @RequestParam(required = false) Long version) {
        return service.archiveProduct(id, version);
    }
    @PostMapping("/products/{id}/variants") public ResponseEntity<VariantView> createVariant(@PathVariable UUID id, @Valid @RequestBody VariantWrite input) {
        VariantView result = service.createVariant(id, input);
        return ResponseEntity.created(URI.create("/api/v1/products/" + id)).body(result);
    }
    @PutMapping("/products/{id}/variants/{variantId}") public VariantView updateVariant(@PathVariable UUID id, @PathVariable UUID variantId,
            @Valid @RequestBody VariantWrite input) { return service.updateVariant(id, variantId, input); }
    @DeleteMapping("/products/{id}/variants/{variantId}") public VariantView archiveVariant(@PathVariable UUID id, @PathVariable UUID variantId,
            @RequestParam(required = false) Long version) { return service.archiveVariant(id, variantId, version); }
}
