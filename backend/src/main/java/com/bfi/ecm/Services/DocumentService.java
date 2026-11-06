package com.bfi.ecm.Services;

import com.bfi.ecm.Mappers.DocumentContent;
import com.bfi.ecm.Mappers.DocumentDto;
import com.bfi.ecm.Mappers.DocumentVersionDto;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface DocumentService {

    DocumentDto upload(MultipartFile file, String folderId, String comment);

    DocumentDto get(String documentId);

    DocumentDto addVersion(String documentId, MultipartFile file, String comment, Long expectedLockVersion);

    List<DocumentVersionDto> versions(String documentId);

    DocumentContent content(String documentId, Integer versionNumber);

    DocumentDto restoreVersion(String documentId, int versionNumber);

    DocumentDto rename(String documentId, String name);

    DocumentDto move(String documentId, String targetFolderId);

    void delete(String documentId);

    List<DocumentDto> trash();

    DocumentDto restoreFromTrash(String documentId);

    void purge(String documentId);

    List<DocumentDto> searchByName(String query, int limit);
}
