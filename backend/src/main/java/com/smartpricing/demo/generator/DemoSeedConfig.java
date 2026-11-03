package com.smartpricing.demo.generator;

import com.smartpricing.common.ApiException;
import java.time.LocalDate;

public record DemoSeedConfig(long seed, LocalDate startDate) {
    public static final String VERSION = "demo-v1";
    public static final long DEFAULT_SEED = 20250101L;
    public static final LocalDate DEFAULT_START = LocalDate.of(2025, 1, 1);

    public DemoSeedConfig {
        if (startDate == null || startDate.getDayOfMonth() != 1 || startDate.getYear() < 2000 || startDate.getYear() > 2100)
            throw ApiException.invalid("Demo start date must be the first day of a month in 2000–2100.");
    }
    public LocalDate endExclusive() { return startDate.plusMonths(12); }
    public static DemoSeedConfig defaults() { return new DemoSeedConfig(DEFAULT_SEED, DEFAULT_START); }
}
