package com.bfi.ecm.Services.ServicesImpl;

import com.bfi.ecm.Entities.Document;
import com.bfi.ecm.Entities.DocumentVersion;
import com.bfi.ecm.Entities.Folder;
import com.bfi.ecm.Entities.User;
import com.bfi.ecm.Enums.AccessLevel;
import com.bfi.ecm.Mappers.DocumentContent;
import com.bfi.ecm.Mappers.DocumentDto;
import com.bfi.ecm.Mappers.DocumentVersionDto;
import com.bfi.ecm.Repository.DocumentRepository;
import com.bfi.ecm.Repository.DocumentVersionRepository;
import com.bfi.ecm.Repository.FolderRepository;
import com.bfi.ecm.Services.BlobStorage;
import com.bfi.ecm.Services.BlobStorage.StoredBlob;
import com.bfi.ecm.Services.DocumentService;
import lombok.RequiredArgsConstructor;
import org.apache.tika.Tika;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.time.Instant;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class DocumentServiceImpl implements DocumentService {

    private static final int MAX_NAME_LENGTH = 255;
    private static final int SEARCH_CANDIDATES = 200;

    private final DocumentRepository documentRepository;
    private final DocumentVersionRepository versionRepository;
    private final FolderRepository folderRepository;
    private final BlobStorage blobStorage;
    private final AccessPolicy accessPolicy;
    private final CurrentUserProvider currentUser;
    private final Tika tika = new Tika();

    @Override
    @Transactional
    public DocumentDto upload(MultipartFile file, String folderId, String comment) {
        User user = currentUser.get();
        Folder folder = folderId == null ? null : findFolder(folderId);
        if (folder != null) {
            accessPolicy.requireFolder(user, folder, AccessLevel.WRITE);
        }
        String name = fileName(file);
        ensureNameAvailable(folder, user, name);

        Document document = new Document();
        document.setName(name);
        document.setFolder(folder);
        document.setOwner(user);
        documentRepository.save(document);

        StoredBlob blob = storeBlob(file);
        document.setCurrentVersion(createVersion(document, 1, blob, detectMimeType(blob, name), comment, user));
        return DocumentDto.fromEntity(documentRepository.saveAndFlush(document), AccessLevel.WRITE);
    }

    @Override
    @Transactional(readOnly = true)
    public DocumentDto get(String documentId) {
        User user = currentUser.get();
        Document document = findLiveDocument(documentId);
        return DocumentDto.fromEntity(document, accessPolicy.requireDocument(user, document, AccessLevel.READ));
    }

    @Override
    @Transactional
    public DocumentDto addVersion(String documentId, MultipartFile file, String comment, Long expectedLockVersion) {
        User user = currentUser.get();
        Document document = findLiveDocument(documentId);
        AccessLevel access = accessPolicy.requireDocument(user, document, AccessLevel.WRITE);
        if (expectedLockVersion != null && expectedLockVersion != document.getLockVersion()) {
            throw new ResponseStatusException(HttpStatus.PRECONDITION_FAILED,
                    "The document changed since you loaded it; reload and try again");
        }

        StoredBlob blob = storeBlob(file);
        DocumentVersion current = document.getCurrentVersion();
        if (current != null && current.getSha256().equals(blob.sha256())) {
            blobStorage.delete(blob.key());
            return DocumentDto.fromEntity(document, access);
        }

        int nextNumber = current == null ? 1 : current.getVersionNumber() + 1;
        document.setCurrentVersion(createVersion(document, nextNumber, blob, detectMimeType(blob, document.getName()), comment, user));
        return DocumentDto.fromEntity(documentRepository.saveAndFlush(document), access);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DocumentVersionDto> versions(String documentId) {
        User user = currentUser.get();
        Document document = findLiveDocument(documentId);
        accessPolicy.requireDocument(user, document, AccessLevel.READ);
        return versionRepository.findByDocumentOrderByVersionNumberDesc(document).stream()
                .map(DocumentVersionDto::fromEntity)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public DocumentContent content(String documentId, Integer versionNumber) {
        User user = currentUser.get();
        Document document = findLiveDocument(documentId);
        accessPolicy.requireDocument(user, document, AccessLevel.READ);
        DocumentVersion version = versionNumber == null
                ? Objects.requireNonNull(document.getCurrentVersion(), "Document has no content")
                : findVersion(document, versionNumber);
        return new DocumentContent(
                blobStorage.load(version.getBlobKey()),
                document.getName(),
                version.getMimeType(),
                version.getSha256(),
                version.getSize());
    }

    @Override
    @Transactional
    public DocumentDto restoreVersion(String documentId, int versionNumber) {
        User user = currentUser.get();
        Document document = findLiveDocument(documentId);
        AccessLevel access = accessPolicy.requireDocument(user, document, AccessLevel.WRITE);
        DocumentVersion source = findVersion(document, versionNumber);
        DocumentVersion current = document.getCurrentVersion();
        if (current.getSha256().equals(source.getSha256())) {
            return DocumentDto.fromEntity(document, access);
        }

        DocumentVersion restored = new DocumentVersion();
        restored.setDocument(document);
        restored.setVersionNumber(current.getVersionNumber() + 1);
        restored.setBlobKey(source.getBlobKey());
        restored.setSha256(source.getSha256());
        restored.setSize(source.getSize());
        restored.setMimeType(source.getMimeType());
        restored.setComment("Restored from version " + versionNumber);
        restored.setCreatedBy(user);
        document.setCurrentVersion(versionRepository.save(restored));
        return DocumentDto.fromEntity(documentRepository.saveAndFlush(document), access);
    }

    @Override
    @Transactional
    public DocumentDto rename(String documentId, String name) {
        User user = currentUser.get();
        Document document = findLiveDocument(documentId);
        AccessLevel access = accessPolicy.requireDocument(user, document, AccessLevel.WRITE);
        String newName = name.trim();
        if (!newName.equalsIgnoreCase(document.getName())) {
            ensureNameAvailable(document.getFolder(), document.getOwner(), newName);
        }
        document.setName(newName);
        return DocumentDto.fromEntity(documentRepository.saveAndFlush(document), access);
    }

    @Override
    @Transactional
    public DocumentDto move(String documentId, String targetFolderId) {
        User user = currentUser.get();
        Document document = findLiveDocument(documentId);
        accessPolicy.requireDocument(user, document, AccessLevel.WRITE);
        Folder target = targetFolderId == null ? null : findFolder(targetFolderId);
        if (target != null) {
            accessPolicy.requireFolder(user, target, AccessLevel.WRITE);
        }
        ensureNameAvailable(target, document.getOwner(), document.getName());
        document.setFolder(target);
        documentRepository.saveAndFlush(document);
        return DocumentDto.fromEntity(document, accessPolicy.documentAccess(user, document).orElse(AccessLevel.READ));
    }

    @Override
    @Transactional
    public void delete(String documentId) {
        User user = currentUser.get();
        Document document = findLiveDocument(documentId);
        accessPolicy.requireDocument(user, document, AccessLevel.WRITE);
        document.setDeletedAt(Instant.now());
    }

    @Override
    @Transactional(readOnly = true)
    public List<DocumentDto> trash() {
        User user = currentUser.get();
        List<Document> trashed = accessPolicy.isAdmin(user)
                ? documentRepository.findByDeletedAtIsNotNullOrderByDeletedAtDesc()
                : documentRepository.findByOwnerAndDeletedAtIsNotNullOrderByDeletedAtDesc(user);
        return trashed.stream().map(document -> DocumentDto.fromEntity(document, AccessLevel.WRITE)).toList();
    }

    @Override
    @Transactional
    public DocumentDto restoreFromTrash(String documentId) {
        User user = currentUser.get();
        Document document = findTrashedDocument(user, documentId);
        ensureNameAvailable(document.getFolder(), document.getOwner(), document.getName());
        document.setDeletedAt(null);
        return DocumentDto.fromEntity(documentRepository.saveAndFlush(document), AccessLevel.WRITE);
    }

    @Override
    @Transactional
    public void purge(String documentId) {
        User user = currentUser.get();
        Document document = findTrashedDocument(user, documentId);
        List<String> blobKeys = versionRepository.findByDocumentOrderByVersionNumberDesc(document).stream()
                .map(DocumentVersion::getBlobKey)
                .distinct()
                .toList();

        document.setCurrentVersion(null);
        documentRepository.saveAndFlush(document);
        versionRepository.deleteByDocument(document);
        documentRepository.delete(document);
        afterCommit(() -> blobKeys.forEach(blobStorage::delete));
    }

    @Override
    @Transactional(readOnly = true)
    public List<DocumentDto> searchByName(String query, int limit) {
        User user = currentUser.get();
        return documentRepository.searchByName(query.trim(), PageRequest.of(0, SEARCH_CANDIDATES)).stream()
                .flatMap(document -> accessPolicy.documentAccess(user, document)
                        .map(access -> DocumentDto.fromEntity(document, access))
                        .stream())
                .limit(limit)
                .toList();
    }

    private DocumentVersion createVersion(Document document, int number, StoredBlob blob, String mimeType, String comment, User author) {
        DocumentVersion version = new DocumentVersion();
        version.setDocument(document);
        version.setVersionNumber(number);
        version.setBlobKey(blob.key());
        version.setSha256(blob.sha256());
        version.setSize(blob.size());
        version.setMimeType(mimeType);
        version.setComment(StringUtils.hasText(comment) ? comment.trim() : null);
        version.setCreatedBy(author);
        return versionRepository.save(version);
    }

    private StoredBlob storeBlob(MultipartFile file) {
        try (InputStream in = file.getInputStream()) {
            StoredBlob blob = blobStorage.store(in);
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    if (status != STATUS_COMMITTED) {
                        blobStorage.delete(blob.key());
                    }
                }
            });
            return blob;
        } catch (IOException e) {
            throw new UncheckedIOException("Could not store uploaded file", e);
        }
    }

    private String detectMimeType(StoredBlob blob, String fileName) {
        try (InputStream in = blobStorage.load(blob.key()).getInputStream()) {
            return tika.detect(in, fileName);
        } catch (IOException e) {
            return "application/octet-stream";
        }
    }

    private static String fileName(MultipartFile file) {
        String original = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().replace('\\', '/');
        String name = StringUtils.getFilename(original);
        name = name == null ? "" : name.replaceAll("\\p{Cntrl}", "").trim();
        if (name.isEmpty() || name.equals(".") || name.equals("..")) {
            name = "untitled";
        }
        return name.length() > MAX_NAME_LENGTH ? name.substring(0, MAX_NAME_LENGTH) : name;
    }

    private void ensureNameAvailable(Folder folder, User owner, String name) {
        boolean taken = folder == null
                ? documentRepository.existsByFolderIsNullAndOwnerAndNameIgnoreCaseAndDeletedAtIsNull(owner, name)
                : documentRepository.existsByFolderAndNameIgnoreCaseAndDeletedAtIsNull(folder, name);
        if (taken) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A document named \"" + name + "\" already exists here; upload it as a new version instead");
        }
    }

    private Folder findFolder(String folderId) {
        return folderRepository.findByUuid(folderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Folder not found"));
    }

    private Document findLiveDocument(String documentId) {
        return documentRepository.findByUuid(documentId)
                .filter(document -> !document.isDeleted())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
    }

    private Document findTrashedDocument(User user, String documentId) {
        Document document = documentRepository.findByUuid(documentId)
                .filter(Document::isDeleted)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found in trash"));
        if (!accessPolicy.isAdmin(user) && !accessPolicy.isOwner(user, document.getOwner())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found in trash");
        }
        return document;
    }

    private DocumentVersion findVersion(Document document, int versionNumber) {
        return versionRepository.findByDocumentAndVersionNumber(document, versionNumber)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Version " + versionNumber + " not found"));
    }

    private static void afterCommit(Runnable action) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                action.run();
            }
        });
    }
}
