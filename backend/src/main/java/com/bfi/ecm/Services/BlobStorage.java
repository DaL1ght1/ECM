package com.bfi.ecm.Services;

import org.springframework.core.io.Resource;

import java.io.IOException;
import java.io.InputStream;

public interface BlobStorage {

    StoredBlob store(InputStream content) throws IOException;

    Resource load(String key);

    void delete(String key);

    record StoredBlob(String key, String sha256, long size) {
    }
}
