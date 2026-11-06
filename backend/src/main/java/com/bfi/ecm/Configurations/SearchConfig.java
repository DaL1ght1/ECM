package com.bfi.ecm.Configurations;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SearchConfig {

    @Bean
    public String searchIndexName(SearchProperties searchProperties) {
        return searchProperties.index();
    }
}
