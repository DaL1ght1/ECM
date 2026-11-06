package com.bfi.ecm.Configurations;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "ecm.search")
public record SearchProperties(
        @NotBlank @DefaultValue("ecm-documents") String index,
        @DefaultValue("true") boolean indexingEnabled,
        @Positive @DefaultValue("1000000") int maxContentChars,
        @Positive @DefaultValue("100") int reconcileBatchSize) {
}
