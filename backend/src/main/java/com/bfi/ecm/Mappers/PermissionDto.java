package com.bfi.ecm.Mappers;

import com.bfi.ecm.Entities.FolderPermission;
import com.bfi.ecm.Enums.AccessLevel;
import com.bfi.ecm.Enums.PrincipalType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PermissionDto(
        @NotNull PrincipalType principalType,
        @NotBlank String principal,
        @NotNull AccessLevel access,
        String displayName) {

    public static PermissionDto fromEntity(FolderPermission permission, String displayName) {
        return new PermissionDto(permission.getPrincipalType(), permission.getPrincipal(), permission.getAccess(), displayName);
    }
}
