package com.bfi.ecm.Configurations;

import com.bfi.ecm.Entities.User;
import com.bfi.ecm.Repository.UserRepository;
import com.bfi.ecm.Tools.BfiTools;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@RequiredArgsConstructor
public class AdminInitialization {

    private static final Logger log = LoggerFactory.getLogger(AdminInitialization.class);

    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;
    private final AdminProperties adminProperties;

    @Bean
    public CommandLineRunner initData() {
        return args -> {
            if (userRepository.findByEmail(adminProperties.email()).isPresent()) {
                return;
            }
            if (BfiTools.isEmpty(adminProperties.password())) {
                log.warn("No admin account exists and ADMIN_PASSWORD is not set; skipping admin seeding");
                return;
            }
            User admin = User.builder()
                    .email(adminProperties.email())
                    .password(passwordEncoder.encode(adminProperties.password()))
                    .role("ADMIN")
                    .accountLocked(false)
                    .enabled(true)
                    .build();
            userRepository.save(admin);
            log.info("Seeded admin account {}", adminProperties.email());
        };
    }
}
