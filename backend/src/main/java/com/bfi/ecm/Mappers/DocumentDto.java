package com.bfi.ecm.Mappers;

import com.bfi.ecm.Entities.Document;
import com.bfi.ecm.Enums.AccessLevel;

import java.time.Instant;
import java.time.OffsetDateTime;

public record DocumentDto(
        String id,
        String name,
        String folderId,
        UserSummary owner,
        DocumentVersionDto currentVersion,
        long lockVersion,
        AccessLevel access,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        Instant deletedAt) {

    public static DocumentDto fromEntity(Document document, AccessLevel access) {
        return new DocumentDto(
                document.getUuid(),
                document.getName(),
                document.getFolder() == null ? null : document.getFolder().getUuid(),
                UserSummary.fromEntity(document.getOwner()),
                document.getCurrentVersion() == null ? null : DocumentVersionDto.fromEntity(document.getCurrentVersion()),
                document.getLockVersion(),
                access,
                document.getCreatedAt(),
                document.getUpdatedAt(),
                document.getDeletedAt());
    }
}
