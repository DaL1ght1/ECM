package com.bfi.ecm;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;

import java.io.IOException;
import java.nio.file.Path;
import java.security.SecureRandom;
import java.util.Base64;

public class TestEcmApplication {

    public static void main(String[] args) throws IOException {
        System.setProperty("spring.devtools.restart.enabled", "false");
        Path data = Path.of("target", "dev-data").toAbsolutePath();
        EmbeddedPostgres postgres = EmbeddedPostgres.builder()
                .setDataDirectory(data.resolve("postgres"))
                .setCleanDataDirectory(false)
                .setPort(54329)
                .start();
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            try {
                postgres.close();
            } catch (IOException ignored) {
            }
        }));

        byte[] secret = new byte[48];
        new SecureRandom().nextBytes(secret);
        defaultProperty("spring.datasource.url", postgres.getJdbcUrl("postgres", "postgres"));
        defaultProperty("spring.datasource.username", "postgres");
        defaultProperty("spring.datasource.password", "postgres");
        defaultProperty("jwt.secret", Base64.getEncoder().encodeToString(secret));
        defaultProperty("ecm.storage.root", data.resolve("blobs").toString());
        defaultProperty("ecm.admin.email", "admin@ecm.local");
        defaultProperty("ecm.admin.password", "admin-dev-password");
        defaultProperty("spring.mail.host", "localhost");
        defaultProperty("spring.mail.port", "2525");
        defaultProperty("mailing.activation-url", "http://localhost:4200/activate");
        defaultProperty("mailing.log-in-url", "http://localhost:4200/login");

        EcmApplication.main(args);
    }

    private static void defaultProperty(String key, String value) {
        if (System.getProperty(key) == null && System.getenv(key.toUpperCase().replace('.', '_').replace('-', '_')) == null) {
            System.setProperty(key, value);
        }
    }
}
