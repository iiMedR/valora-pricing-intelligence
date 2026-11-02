package com.smartpricing.business;

import com.smartpricing.business.dto.BusinessDtos.Update;
import com.smartpricing.business.entity.BusinessSettings;
import com.smartpricing.business.repository.BusinessSettingsRepository;
import com.smartpricing.business.service.BusinessService;
import com.smartpricing.catalog.repository.VariantRepository;
import com.smartpricing.common.ApiException;
import org.junit.jupiter.api.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class BusinessServiceTest {
    BusinessSettingsRepository repository = mock(BusinessSettingsRepository.class);
    VariantRepository variants = mock(VariantRepository.class);
    BusinessService service = new BusinessService(repository, variants);
    BusinessSettings settings = new BusinessSettings();

    @BeforeEach void setup() {
        settings.setId(1L); settings.setDisplayName("My Business"); settings.setCurrencyCode("MAD");
        when(repository.lockSingleton()).thenReturn(settings);
        when(repository.saveAndFlush(any())).thenAnswer(call -> call.getArgument(0));
    }
    @Test void allowsCurrencyBeforeVariantsAndNameAfterwards() {
        assertThat(service.update(new Update("New Name", "USD", 0L)).currencyCode()).isEqualTo("USD");
        when(variants.count()).thenReturn(1L);
        assertThat(service.update(new Update("Another Name", "USD", 0L)).displayName()).isEqualTo("Another Name");
    }
    @Test void blocksCurrencyWithAnyVariants() {
        when(variants.count()).thenReturn(1L);
        assertThatThrownBy(() -> service.update(new Update("Business", "USD", 0L)))
                .isInstanceOfSatisfying(ApiException.class, error -> assertThat(error.code()).isEqualTo("CURRENCY_LOCKED"));
    }
    @Test void rejectsUnknownOrLowercaseCurrencyAndStaleVersion() {
        for (String currency : new String[]{"ZZZ", "usd", "US"}) {
            assertThatThrownBy(() -> service.update(new Update("Business", currency, 0L))).isInstanceOf(ApiException.class);
        }
        assertThatThrownBy(() -> service.update(new Update("Business", "MAD", 2L))).isInstanceOf(ApiException.class);
    }
}
