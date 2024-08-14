package com.bfi.ecm;

import com.bfi.ecm.Configurations.FileStorageProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableConfigurationProperties({
        FileStorageProperties.class
})
@EnableJpaAuditing
@EnableJpaRepositories("com.bfi.ecm.Repository")
@EnableAsync
public class EcmApplication {

    public static void main(String[] args) {
        SpringApplication.run(EcmApplication.class, args);
    }


}
