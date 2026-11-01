package com.smartpricing.business.dto;

import jakarta.validation.constraints.*;
import java.time.Instant;

public final class BusinessDtos {
    private BusinessDtos() {}
    public record Update(@NotBlank @Size(min = 2, max = 120) String displayName,
                         @NotBlank @Pattern(regexp = "[A-Z]{3}") String currencyCode,
                         @NotNull @PositiveOrZero Long version) {}
    public record Settings(long id, String displayName, String currencyCode, Instant createdAt,
                           Instant updatedAt, long version) {}
}
