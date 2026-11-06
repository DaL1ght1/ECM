package com.bfi.ecm.Configurations;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

/**
 * Kept off the main class so @WebMvcTest slices can start without a database.
 */
@Configuration
@EnableJpaAuditing
@EnableJpaRepositories("com.bfi.ecm.Repository")
public class JpaConfig {
}
