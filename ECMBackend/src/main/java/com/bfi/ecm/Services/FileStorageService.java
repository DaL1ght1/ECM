package com.bfi.ecm.Services;

import org.springframework.core.io.Resource;

import java.io.IOException;

public interface FileStorageService {

    public Resource loadFileAsResource(Long id);

    public String storeFile(String content, Long id, String Name) throws IOException;
}