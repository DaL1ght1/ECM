package com.bfi.ecm.Mappers;

import com.bfi.ecm.Entities.DocumentVersion;

import java.time.OffsetDateTime;

public record DocumentVersionDto(
        int versionNumber,
        long size,
        String mimeType,
        String sha256,
        String comment,
        UserSummary createdBy,
        OffsetDateTime createdAt) {

    public static DocumentVersionDto fromEntity(DocumentVersion version) {
        return new DocumentVersionDto(
                version.getVersionNumber(),
                version.getSize(),
                version.getMimeType(),
                version.getSha256(),
                version.getComment(),
                UserSummary.fromEntity(version.getCreatedBy()),
                version.getCreatedAt());
    }
}
