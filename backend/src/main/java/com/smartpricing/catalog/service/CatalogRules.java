package com.smartpricing.catalog.service;

import com.smartpricing.catalog.dto.CatalogDtos.VariantWrite;
import com.smartpricing.common.ApiException;
import java.math.BigDecimal;

public final class CatalogRules {
    private CatalogRules() {}

    public static String text(String value, int min, int max, String label) {
        if (value == null || value.strip().length() < min || value.strip().length() > max) {
            throw ApiException.invalid(label + " must contain " + min + "–" + max + " characters.");
        }
        return value.strip();
    }

    public static void prices(VariantWrite input) {
        amount(input.costPrice(), true, "Cost price");
        amount(input.currentPrice(), false, "Current price");
        amount(input.minPrice(), false, "Minimum price");
        amount(input.maxPrice(), false, "Maximum price");
        if (input.minPrice().compareTo(input.currentPrice()) > 0 || input.currentPrice().compareTo(input.maxPrice()) > 0) {
            throw ApiException.invalid("Prices must satisfy minimum ≤ current ≤ maximum.");
        }
        if (input.status() == null) throw ApiException.invalid("Variant status is required.");
    }

    private static void amount(BigDecimal value, boolean allowZero, String label) {
        if (value == null || value.signum() < 0 || (!allowZero && value.signum() == 0)
                || value.scale() > 4 || value.precision() - value.scale() > 15) {
            throw ApiException.invalid(label + " must be " + (allowZero ? "nonnegative" : "positive")
                    + " with at most 15 integer digits and 4 decimal places.");
        }
    }
}
