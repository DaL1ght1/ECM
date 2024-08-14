package com.bfi.ecm.Configurations;

import com.bfi.ecm.Entities.User;
import com.bfi.ecm.Repository.UserRepository;
import lombok.AllArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@AllArgsConstructor
public class AdminInitialization {

    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;

    @Bean
    public CommandLineRunner initData() {
        return args -> {
            // Create admin user if not exists
            if (userRepository.findByEmail("admin@admin.com").isEmpty()) {
                User admin = User.builder()
                        .email("admin@admin.com")
                        .password(passwordEncoder.encode("admin123"))
                        .role("ADMIN")
                        .accountLocked(false)
                        .enabled(true)
                        .build();
                userRepository.save(admin);
            }
        };
    }
}