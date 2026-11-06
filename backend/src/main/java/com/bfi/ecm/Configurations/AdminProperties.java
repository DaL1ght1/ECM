package com.bfi.ecm.Configurations;

import com.bfi.ecm.Tools.BfiTools;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Bootstrap admin account and the address that receives "new user pending approval" emails.
 * No password default: when ADMIN_PASSWORD is unset, no admin account is seeded.
 */
@ConfigurationProperties(prefix = "ecm.admin")
public record AdminProperties(
        @DefaultValue("admin@admin.com") String email,
        String password,
        String notificationEmail) {

    @Override
    public String notificationEmail() {
        return BfiTools.isEmpty(notificationEmail) ? email : notificationEmail;
    }
}
