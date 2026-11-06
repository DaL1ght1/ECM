package com.bfi.ecm.Services.ServicesImpl;

import com.bfi.ecm.Entities.Document;
import com.bfi.ecm.Entities.Folder;
import com.bfi.ecm.Entities.FolderPermission;
import com.bfi.ecm.Entities.User;
import com.bfi.ecm.Enums.AccessLevel;
import com.bfi.ecm.Enums.PrincipalType;
import com.bfi.ecm.Events.SearchIndexEvent;
import com.bfi.ecm.Mappers.DocumentDto;
import com.bfi.ecm.Mappers.FolderContentsDto;
import com.bfi.ecm.Mappers.FolderDto;
import com.bfi.ecm.Mappers.PermissionDto;
import com.bfi.ecm.Repository.DocumentRepository;
import com.bfi.ecm.Repository.FolderPermissionRepository;
import com.bfi.ecm.Repository.FolderRepository;
import com.bfi.ecm.Repository.UserRepository;
import com.bfi.ecm.Requests.CreateFolderRequest;
import com.bfi.ecm.Services.FolderService;
import com.bfi.ecm.Tools.Roles;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Deque;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class FolderServiceImpl implements FolderService {

    private final FolderRepository folderRepository;
    private final DocumentRepository documentRepository;
    private final FolderPermissionRepository permissionRepository;
    private final UserRepository userRepository;
    private final AccessPolicy accessPolicy;
    private final CurrentUserProvider currentUser;
    private final ApplicationEventPublisher events;

    @Override
    @Transactional(readOnly = true)
    public FolderContentsDto root() {
        User user = currentUser.get();
        boolean admin = accessPolicy.isAdmin(user);
        List<Folder> folders = admin
                ? folderRepository.findByParentIsNullOrderByNameAsc()
                : folderRepository.findByParentIsNullAndOwnerOrderByNameAsc(user);
        List<Document> documents = admin
                ? documentRepository.findByFolderIsNullAndDeletedAtIsNullOrderByNameAsc()
                : documentRepository.findByFolderIsNullAndOwnerAndDeletedAtIsNullOrderByNameAsc(user);
        return new FolderContentsDto(
                null,
                List.of(),
                folders.stream().map(folder -> FolderDto.fromEntity(folder, AccessLevel.WRITE)).toList(),
                documents.stream().map(document -> DocumentDto.fromEntity(document, AccessLevel.WRITE)).toList());
    }

    @Override
    @Transactional(readOnly = true)
    public FolderContentsDto contents(String folderId) {
        User user = currentUser.get();
        Folder folder = findFolder(folderId);
        AccessLevel access = accessPolicy.requireFolder(user, folder, AccessLevel.READ);

        List<FolderDto> breadcrumbs = new ArrayList<>();
        for (Folder current = folder; current != null; current = current.getParent()) {
            breadcrumbs.add(FolderDto.fromEntity(current, null));
        }
        Collections.reverse(breadcrumbs);

        List<FolderDto> children = folderRepository.findByParentOrderByNameAsc(folder).stream()
                .map(child -> FolderDto.fromEntity(child, accessPolicy.childFolderAccess(user, child, access)))
                .toList();
        List<DocumentDto> documents = documentRepository.findByFolderAndDeletedAtIsNullOrderByNameAsc(folder).stream()
                .map(document -> DocumentDto.fromEntity(document, accessPolicy.childDocumentAccess(user, document, access)))
                .toList();
        return new FolderContentsDto(FolderDto.fromEntity(folder, access), breadcrumbs, children, documents);
    }

    @Override
    @Transactional(readOnly = true)
    public List<FolderDto> sharedWithMe() {
        User user = currentUser.get();
        return folderRepository.findSharedWith(user.getUuid(), user.getRole()).stream()
                .filter(folder -> !accessPolicy.isOwner(user, folder.getOwner()))
                .map(folder -> FolderDto.fromEntity(folder, accessPolicy.folderAccess(user, folder).orElse(AccessLevel.READ)))
                .toList();
    }

    @Override
    @Transactional
    public FolderDto create(CreateFolderRequest request) {
        User user = currentUser.get();
        Folder parent = request.parentId() == null ? null : findFolder(request.parentId());
        if (parent != null) {
            accessPolicy.requireFolder(user, parent, AccessLevel.WRITE);
        }
        String name = request.name().trim();
        ensureNameAvailable(parent, user, name);

        Folder folder = new Folder();
        folder.setName(name);
        folder.setParent(parent);
        folder.setOwner(user);
        folderRepository.save(folder);
        return FolderDto.fromEntity(folder, AccessLevel.WRITE);
    }

    @Override
    @Transactional
    public FolderDto rename(String folderId, String name) {
        User user = currentUser.get();
        Folder folder = findFolder(folderId);
        AccessLevel access = accessPolicy.requireFolder(user, folder, AccessLevel.WRITE);
        String newName = name.trim();
        if (!newName.equalsIgnoreCase(folder.getName())) {
            ensureNameAvailable(folder.getParent(), folder.getOwner(), newName);
        }
        folder.setName(newName);
        reindexSubtree(folder);
        return FolderDto.fromEntity(folder, access);
    }

    @Override
    @Transactional
    public FolderDto move(String folderId, String targetFolderId) {
        User user = currentUser.get();
        Folder folder = findFolder(folderId);
        accessPolicy.requireFolder(user, folder, AccessLevel.WRITE);
        Folder target = targetFolderId == null ? null : findFolder(targetFolderId);
        if (target != null) {
            accessPolicy.requireFolder(user, target, AccessLevel.WRITE);
            for (Folder current = target; current != null; current = current.getParent()) {
                if (current.getId().equals(folder.getId())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A folder cannot be moved into itself");
                }
            }
        }
        ensureNameAvailable(target, folder.getOwner(), folder.getName());
        folder.setParent(target);
        reindexSubtree(folder);
        return FolderDto.fromEntity(folder, accessPolicy.folderAccess(user, folder).orElse(AccessLevel.READ));
    }

    @Override
    @Transactional
    public void delete(String folderId) {
        User user = currentUser.get();
        Folder folder = findFolder(folderId);
        accessPolicy.requireFolder(user, folder, AccessLevel.WRITE);

        List<Folder> subtree = collectSubtree(folder);
        Instant now = Instant.now();
        List<Document> affected = documentRepository.findByFolderIn(subtree);
        events.publishEvent(SearchIndexEvent.of(affected.stream().map(Document::getUuid).toList()));
        for (Document document : affected) {
            if (document.getDeletedAt() == null) {
                document.setDeletedAt(now);
            }
            document.setFolder(null);
        }
        permissionRepository.deleteByFolderIn(subtree);
        Collections.reverse(subtree);
        folderRepository.deleteAll(subtree);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PermissionDto> permissions(String folderId) {
        Folder folder = findManageableFolder(folderId);
        return permissionRepository.findByFolder(folder).stream().map(PermissionDto::fromEntity).toList();
    }

    @Override
    @Transactional
    public List<PermissionDto> replacePermissions(String folderId, List<PermissionDto> permissions) {
        Folder folder = findManageableFolder(folderId);
        Set<String> seen = new HashSet<>();
        for (PermissionDto permission : permissions) {
            validatePrincipal(permission);
            if (!seen.add(permission.principalType() + ":" + permission.principal())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Duplicate permission for " + permission.principal());
            }
        }
        permissionRepository.deleteByFolderIn(List.of(folder));
        List<FolderPermission> saved = permissions.stream().map(dto -> {
            FolderPermission permission = new FolderPermission();
            permission.setFolder(folder);
            permission.setPrincipalType(dto.principalType());
            permission.setPrincipal(dto.principal());
            permission.setAccess(dto.access());
            return permission;
        }).toList();
        List<PermissionDto> result = permissionRepository.saveAll(saved).stream().map(PermissionDto::fromEntity).toList();
        reindexSubtree(folder);
        return result;
    }

    private Folder findFolder(String folderId) {
        return folderRepository.findByUuid(folderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found"));
    }

    private Folder findManageableFolder(String folderId) {
        User user = currentUser.get();
        Folder folder = findFolder(folderId);
        accessPolicy.requireFolder(user, folder, AccessLevel.READ);
        if (!accessPolicy.canManagePermissions(user, folder)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the folder owner or an admin can manage permissions");
        }
        return folder;
    }

    private void ensureNameAvailable(Folder parent, User owner, String name) {
        boolean taken = parent == null
                ? folderRepository.existsByParentIsNullAndOwnerAndNameIgnoreCase(owner, name)
                : folderRepository.existsByParentAndNameIgnoreCase(parent, name);
        if (taken) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A folder named \"" + name + "\" already exists here");
        }
    }

    private void validatePrincipal(PermissionDto permission) {
        boolean valid = permission.principalType() == PrincipalType.USER
                ? userRepository.findByUuid(permission.principal()).isPresent()
                : Roles.ASSIGNABLE.contains(permission.principal());
        if (!valid) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Unknown " + permission.principalType().name().toLowerCase() + ": " + permission.principal());
        }
    }

    private void reindexSubtree(Folder folder) {
        List<Folder> subtree = collectSubtree(folder);
        documentRepository.markStaleInFolders(subtree);
        List<String> documentIds = documentRepository.findByFolderIn(subtree).stream()
                .filter(document -> !document.isDeleted())
                .map(Document::getUuid)
                .toList();
        if (!documentIds.isEmpty()) {
            events.publishEvent(SearchIndexEvent.of(documentIds));
        }
    }

    private List<Folder> collectSubtree(Folder root) {
        List<Folder> subtree = new ArrayList<>();
        Deque<Folder> queue = new ArrayDeque<>(List.of(root));
        while (!queue.isEmpty()) {
            Folder current = queue.poll();
            subtree.add(current);
            queue.addAll(folderRepository.findByParentOrderByNameAsc(current));
        }
        return subtree;
    }
}
