package com.bfi.ecm;

import com.bfi.ecm.Configurations.AdminProperties;
import com.bfi.ecm.Configurations.FileStorageProperties;
import com.bfi.ecm.Configurations.security.JwtProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableConfigurationProperties({
        FileStorageProperties.class,
        JwtProperties.class,
        AdminProperties.class
})
@EnableAsync
public class EcmApplication {

    public static void main(String[] args) {
        SpringApplication.run(EcmApplication.class, args);
    }


}
