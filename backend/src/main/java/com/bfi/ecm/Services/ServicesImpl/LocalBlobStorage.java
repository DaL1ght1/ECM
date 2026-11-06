package com.bfi.ecm.Services.ServicesImpl;

import com.bfi.ecm.Configurations.StorageProperties;
import com.bfi.ecm.Services.BlobStorage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
public class LocalBlobStorage implements BlobStorage {

    private static final Logger log = LoggerFactory.getLogger(LocalBlobStorage.class);
    private static final Pattern KEY_PATTERN = Pattern.compile("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}");

    private final Path root;
    private final Path tempDir;

    public LocalBlobStorage(StorageProperties storageProperties) {
        this.root = Path.of(storageProperties.root()).toAbsolutePath().normalize();
        this.tempDir = root.resolve(".tmp");
        try {
            Files.createDirectories(tempDir);
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot create blob storage at " + root, e);
        }
    }

    @Override
    public StoredBlob store(InputStream content) throws IOException {
        String key = UUID.randomUUID().toString();
        Path temp = Files.createTempFile(tempDir, "upload-", ".part");
        try {
            MessageDigest digest = sha256();
            long size;
            try (InputStream in = new DigestInputStream(content, digest);
                 OutputStream out = Files.newOutputStream(temp)) {
                size = in.transferTo(out);
            }
            Path target = resolve(key);
            Files.createDirectories(target.getParent());
            Files.move(temp, target, StandardCopyOption.ATOMIC_MOVE);
            return new StoredBlob(key, HexFormat.of().formatHex(digest.digest()), size);
        } finally {
            Files.deleteIfExists(temp);
        }
    }

    @Override
    public Resource load(String key) {
        Path path = resolve(key);
        if (!Files.isRegularFile(path)) {
            throw new IllegalStateException("Blob " + key + " is missing from storage");
        }
        return new FileSystemResource(path);
    }

    @Override
    public void delete(String key) {
        try {
            Files.deleteIfExists(resolve(key));
        } catch (IOException e) {
            log.warn("Could not delete blob {}", key, e);
        }
    }

    private Path resolve(String key) {
        if (key == null || !KEY_PATTERN.matcher(key).matches()) {
            throw new IllegalArgumentException("Invalid blob key");
        }
        return root.resolve(key.substring(0, 2)).resolve(key.substring(2, 4)).resolve(key);
    }

    private static MessageDigest sha256() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
