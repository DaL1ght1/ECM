package com.bfi.ecm.Mappers;

import com.bfi.ecm.Entities.Folder;
import com.bfi.ecm.Enums.AccessLevel;

import java.time.OffsetDateTime;

public record FolderDto(
        String id,
        String name,
        String parentId,
        UserSummary owner,
        AccessLevel access,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {

    public static FolderDto fromEntity(Folder folder, AccessLevel access) {
        return new FolderDto(
                folder.getUuid(),
                folder.getName(),
                folder.getParent() == null ? null : folder.getParent().getUuid(),
                UserSummary.fromEntity(folder.getOwner()),
                access,
                folder.getCreatedAt(),
                folder.getUpdatedAt());
    }
}
