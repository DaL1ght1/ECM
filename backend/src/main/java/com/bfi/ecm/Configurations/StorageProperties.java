package com.bfi.ecm.Configurations;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "ecm.storage")
public record StorageProperties(@NotBlank @DefaultValue("./data/blobs") String root) {
}
