package com.smartpricing.business.service;

import com.smartpricing.business.dto.BusinessDtos.*;
import com.smartpricing.business.entity.BusinessSettings;
import com.smartpricing.business.repository.BusinessSettingsRepository;
import com.smartpricing.catalog.repository.VariantRepository;
import com.smartpricing.catalog.service.CatalogRules;
import com.smartpricing.common.ApiException;
import java.util.Currency;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class BusinessService {
    private final BusinessSettingsRepository settings;
    private final VariantRepository variants;

    public BusinessService(BusinessSettingsRepository settings, VariantRepository variants) {
        this.settings = settings;
        this.variants = variants;
    }

    public Settings get() { return view(settings.findById(1L).orElseThrow(() -> ApiException.missing("Business settings"))); }

    @Transactional
    public Settings update(Update input) {
        String name = CatalogRules.text(input.displayName(), 2, 120, "Display name");
        try {
            if (input.currencyCode() == null || !input.currencyCode().matches("[A-Z]{3}")) throw new IllegalArgumentException();
            Currency.getInstance(input.currencyCode());
        } catch (IllegalArgumentException exception) {
            throw ApiException.invalid("Currency must be a valid uppercase ISO 4217 code.");
        }
        BusinessSettings entity = settings.lockSingleton();
        entity.checkVersion(input.version());
        if (!entity.getCurrencyCode().equals(input.currencyCode()) && variants.count() > 0) {
            throw ApiException.conflict("CURRENCY_LOCKED", "Currency cannot change while any variants exist, including archived variants.");
        }
        entity.setDisplayName(name);
        entity.setCurrencyCode(input.currencyCode());
        return view(settings.saveAndFlush(entity));
    }

    private Settings view(BusinessSettings entity) {
        return new Settings(entity.getId(), entity.getDisplayName(), entity.getCurrencyCode(),
                entity.getCreatedAt(), entity.getUpdatedAt(), entity.getVersion());
    }
}
