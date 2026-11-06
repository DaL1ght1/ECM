package com.bfi.ecm.Configurations.security;


import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;

import static org.springframework.security.config.Customizer.withDefaults;
import static org.springframework.security.config.http.SessionCreationPolicy.STATELESS;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
@EnableMethodSecurity(securedEnabled = true)
public class SecurityConfigAdvanced {

    private static final String[] PUBLIC_ENDPOINTS = {
            "/api/v1/auth/**",
            "/error",
            "/v3/api-docs",
            "/v3/api-docs/**",
            "/swagger-ui/**",
            "/swagger-ui.html"
    };

    private final JwtAuthenticationConverter jwtAuthenticationConverter;
    private final JsonSecurityErrorHandler securityErrorHandler;

    @Bean
    public SecurityFilterChain configure(HttpSecurity http) throws Exception {

        http.cors(withDefaults())
                .csrf(AbstractHttpConfigurer::disable)
                .authorizeHttpRequests(req -> req
                        .requestMatchers(PUBLIC_ENDPOINTS).permitAll()
                        .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated())
                .sessionManagement(session -> session.sessionCreationPolicy(STATELESS))
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter))
                        .authenticationEntryPoint(securityErrorHandler)
                        .accessDeniedHandler(securityErrorHandler))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(securityErrorHandler)
                        .accessDeniedHandler(securityErrorHandler));
        return http.build();
    }
}
