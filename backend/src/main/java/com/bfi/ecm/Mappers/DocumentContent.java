package com.bfi.ecm.Mappers;

import org.springframework.core.io.Resource;

public record DocumentContent(Resource resource, String fileName, String mimeType, String sha256, long size) {
}
