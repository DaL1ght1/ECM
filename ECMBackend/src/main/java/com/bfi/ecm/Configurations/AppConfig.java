package com.bfi.ecm.Configurations;

import com.bfi.ecm.Entities.Directory;
import com.bfi.ecm.Repository.DirectoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@RequiredArgsConstructor
public class AppConfig {

    private final DirectoryRepository directoryRepository;

    @Bean
    public CommandLineRunner init() {
        return args -> {
            if (directoryRepository.findById(1L).isEmpty()) {
                Directory rootDirectory = new Directory();
                rootDirectory.setId(1L);
                rootDirectory.setName("Root");
                rootDirectory.setPath("fileDirectory");
                rootDirectory.setParent(rootDirectory);

                directoryRepository.save(rootDirectory);
            }
        };
    }
}
