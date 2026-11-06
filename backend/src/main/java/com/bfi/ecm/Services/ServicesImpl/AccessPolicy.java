package com.bfi.ecm.Services.ServicesImpl;

import com.bfi.ecm.Entities.Document;
import com.bfi.ecm.Entities.Folder;
import com.bfi.ecm.Entities.FolderPermission;
import com.bfi.ecm.Entities.User;
import com.bfi.ecm.Enums.AccessLevel;
import com.bfi.ecm.Repository.FolderPermissionRepository;
import com.bfi.ecm.Tools.Roles;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AccessPolicy {

    private final FolderPermissionRepository permissionRepository;

    public boolean isAdmin(User user) {
        return Roles.ADMIN.equals(user.getRole());
    }

    public boolean isOwner(User user, User owner) {
        return owner != null && owner.getId().equals(user.getId());
    }

    public Optional<AccessLevel> folderAccess(User user, Folder folder) {
        if (isAdmin(user)) {
            return Optional.of(AccessLevel.WRITE);
        }
        AccessLevel granted = null;
        for (Folder current = folder; current != null; current = current.getParent()) {
            granted = strongest(granted, directAccess(user, current));
            if (granted == AccessLevel.WRITE) {
                return Optional.of(AccessLevel.WRITE);
            }
        }
        return Optional.ofNullable(granted);
    }

    public AccessLevel childFolderAccess(User user, Folder child, AccessLevel inherited) {
        return inherited == AccessLevel.WRITE ? inherited : strongest(inherited, directAccess(user, child));
    }

    public Optional<AccessLevel> documentAccess(User user, Document document) {
        if (isAdmin(user) || isOwner(user, document.getOwner())) {
            return Optional.of(AccessLevel.WRITE);
        }
        return document.getFolder() == null ? Optional.empty() : folderAccess(user, document.getFolder());
    }

    public AccessLevel childDocumentAccess(User user, Document document, AccessLevel inherited) {
        return isOwner(user, document.getOwner()) ? AccessLevel.WRITE : inherited;
    }

    public boolean canManagePermissions(User user, Folder folder) {
        if (isAdmin(user)) {
            return true;
        }
        for (Folder current = folder; current != null; current = current.getParent()) {
            if (isOwner(user, current.getOwner())) {
                return true;
            }
        }
        return false;
    }

    public AccessLevel requireFolder(User user, Folder folder, AccessLevel required) {
        return require(folderAccess(user, folder), required, "Folder");
    }

    public AccessLevel requireDocument(User user, Document document, AccessLevel required) {
        return require(documentAccess(user, document), required, "Document");
    }

    private AccessLevel directAccess(User user, Folder folder) {
        if (isOwner(user, folder.getOwner())) {
            return AccessLevel.WRITE;
        }
        AccessLevel granted = null;
        for (FolderPermission permission : permissionRepository.findByFolder(folder)) {
            if (permission.appliesTo(user)) {
                granted = strongest(granted, permission.getAccess());
            }
        }
        return granted;
    }

    private static AccessLevel strongest(AccessLevel a, AccessLevel b) {
        if (a == null) {
            return b;
        }
        if (b == null) {
            return a;
        }
        return a.includes(b) ? a : b;
    }

    private static AccessLevel require(Optional<AccessLevel> access, AccessLevel required, String resource) {
        if (access.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, resource + " not found");
        }
        if (!access.get().includes(required)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You need " + required + " access to this " + resource.toLowerCase());
        }
        return access.get();
    }
}
