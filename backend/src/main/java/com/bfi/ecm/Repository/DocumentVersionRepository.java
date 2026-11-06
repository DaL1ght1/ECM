package com.bfi.ecm.Repository;

import com.bfi.ecm.Entities.Document;
import com.bfi.ecm.Entities.DocumentVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentVersionRepository extends JpaRepository<DocumentVersion, Long> {

    List<DocumentVersion> findByDocumentOrderByVersionNumberDesc(Document document);

    Optional<DocumentVersion> findByDocumentAndVersionNumber(Document document, int versionNumber);

    void deleteByDocument(Document document);
}
