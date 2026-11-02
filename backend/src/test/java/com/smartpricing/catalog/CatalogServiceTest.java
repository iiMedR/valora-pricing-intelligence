package com.smartpricing.catalog;

import com.smartpricing.business.repository.BusinessSettingsRepository;
import com.smartpricing.catalog.dto.CatalogDtos.*;
import com.smartpricing.catalog.entity.*;
import com.smartpricing.catalog.repository.*;
import com.smartpricing.catalog.service.*;
import com.smartpricing.common.ApiException;
import java.math.BigDecimal;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.test.util.ReflectionTestUtils;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static com.smartpricing.catalog.entity.CatalogStatus.*;

class CatalogServiceTest {
    CategoryRepository categories = mock(CategoryRepository.class);
    ProductRepository products = mock(ProductRepository.class);
    VariantRepository variants = mock(VariantRepository.class);
    BusinessSettingsRepository settings = mock(BusinessSettingsRepository.class);
    CatalogService service = new CatalogService(categories, products, variants, settings,
            mock(com.smartpricing.history.service.VariantHistoryService.class));
    UUID id = UUID.randomUUID();

    VariantWrite input(String cost, String current, String min, String max) {
        return new VariantWrite("SKU-1", "Standard", new BigDecimal(cost), new BigDecimal(current),
                new BigDecimal(min), new BigDecimal(max), ACTIVE, 0L);
    }

    @ParameterizedTest
    @CsvSource({"-1,10,5,20", "1,0,1,20", "1,10,0,20", "1,10,5,0", "1,4,5,20", "1,21,5,20", "1,10,20,5", "1.00001,10,5,20", "1,10.00001,5,20", "1000000000000000,10,5,20"})
    void rejectsInvalidMoney(String cost, String current, String min, String max) {
        assertThatThrownBy(() -> service.createVariant(id, input(cost, current, min, max))).isInstanceOf(ApiException.class);
        verifyNoInteractions(settings);
    }

    @Test void lossLeadersAreAllowedAndFlagged() {
        when(products.findLockedById(id)).thenReturn(Optional.of(new Product()));
        when(variants.saveAndFlush(any())).thenAnswer(call -> call.getArgument(0));
        assertThat(service.createVariant(id, input("15", "10", "5", "20")).belowCost()).isTrue();
    }

    @Test void duplicateSkuIsAConflict() {
        when(products.findLockedById(id)).thenReturn(Optional.of(new Product()));
        when(variants.existsBySkuIgnoreCase("SKU-1")).thenReturn(true);
        assertThatThrownBy(() -> service.createVariant(id, input("1", "10", "5", "20")))
                .isInstanceOfSatisfying(ApiException.class, error -> assertThat(error.code()).isEqualTo("DUPLICATE_SKU"));
    }

    @Test void missingCategoryAndProductAreReported() {
        assertThatThrownBy(() -> service.createProduct(new ProductWrite("Test", null, id, null, null)))
                .isInstanceOfSatisfying(ApiException.class, error -> assertThat(error.status().value()).isEqualTo(404));
        assertThatThrownBy(() -> service.createVariant(id, input("1", "10", "5", "20"))).isInstanceOf(ApiException.class);
    }

    @Test void newProductCannotStartActive() {
        assertThatThrownBy(() -> service.createProduct(new ProductWrite("Test", null, null, ACTIVE, null))).isInstanceOf(ApiException.class);
    }

    @Test void activationRequiresAnActiveVariant() {
        Product product = new Product(); product.setStatus(ARCHIVED);
        when(products.findLockedById(id)).thenReturn(Optional.of(product));
        assertThatThrownBy(() -> service.updateProduct(id, new ProductWrite("Test", null, null, ACTIVE, 0L)))
                .isInstanceOfSatisfying(ApiException.class, error -> assertThat(error.code()).isEqualTo("ACTIVE_VARIANT_REQUIRED"));
    }

    @Test void categoryInUseCannotBeDeleted() {
        when(categories.findById(id)).thenReturn(Optional.of(new Category()));
        when(products.existsByCategoryId(id)).thenReturn(true);
        assertThatThrownBy(() -> service.deleteCategory(id, null)).isInstanceOf(ApiException.class);
        verify(categories, never()).delete(any());
    }

    @Test void archiveLastVariantAlsoArchivesParentWithoutDeletingRecords() {
        Product product = new Product(); product.setStatus(ACTIVE); ReflectionTestUtils.setField(product, "id", id);
        ProductVariant variant = new ProductVariant();
        variant.setCostPrice(BigDecimal.ONE); variant.setCurrentPrice(BigDecimal.TEN);
        variant.setMinPrice(BigDecimal.ONE); variant.setMaxPrice(BigDecimal.TEN);
        when(products.findLockedById(id)).thenReturn(Optional.of(product));
        when(variants.findByIdAndProductId(id, id)).thenReturn(Optional.of(variant));
        when(variants.saveAndFlush(any())).thenAnswer(call -> call.getArgument(0));
        service.archiveVariant(id, id, 0L);
        assertThat(variant.getStatus()).isEqualTo(ARCHIVED);
        assertThat(product.getStatus()).isEqualTo(ARCHIVED);
        verify(variants, never()).delete(any(ProductVariant.class)); verify(products, never()).delete(any(Product.class));
    }

    @Test void rejectsStaleEditsAndInvalidPagination() {
        when(products.findLockedById(id)).thenReturn(Optional.of(new Product()));
        assertThatThrownBy(() -> service.updateProduct(id, new ProductWrite("Test", null, null, ARCHIVED, 2L)))
                .isInstanceOfSatisfying(ApiException.class, error -> assertThat(error.code()).isEqualTo("STALE_VERSION"));
        assertThatThrownBy(() -> service.products(0, 101, null, null, null)).isInstanceOf(ApiException.class);
    }
}
