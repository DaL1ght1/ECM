package com.bfi.ecm.Repository;

import com.bfi.ecm.Entities.Document;
import com.bfi.ecm.Entities.Folder;
import com.bfi.ecm.Entities.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {

    Optional<Document> findByUuid(String uuid);

    List<Document> findByFolderAndDeletedAtIsNullOrderByNameAsc(Folder folder);

    List<Document> findByFolderIsNullAndDeletedAtIsNullOrderByNameAsc();

    List<Document> findByFolderIsNullAndOwnerAndDeletedAtIsNullOrderByNameAsc(User owner);

    List<Document> findByFolderIn(Collection<Folder> folders);

    List<Document> findByDeletedAtIsNotNullOrderByDeletedAtDesc();

    List<Document> findByOwnerAndDeletedAtIsNotNullOrderByDeletedAtDesc(User owner);

    boolean existsByFolderAndNameIgnoreCaseAndDeletedAtIsNull(Folder folder, String name);

    boolean existsByFolderIsNullAndOwnerAndNameIgnoreCaseAndDeletedAtIsNull(User owner, String name);

    List<Document> findByUuidIn(Collection<String> uuids);

    @Query("""
            SELECT d.uuid FROM Document d
            WHERE d.deletedAt IS NULL
              AND (d.searchIndexedVersion IS NULL OR d.searchIndexedVersion <> d.lockVersion)
            ORDER BY d.id
            """)
    List<String> findStaleForSearch(Pageable pageable);

    @Modifying
    @Query("UPDATE Document d SET d.searchIndexedVersion = :version WHERE d.id = :id AND d.lockVersion = :version")
    int markIndexed(@Param("id") Long id, @Param("version") long version);

    @Modifying
    @Query("UPDATE Document d SET d.searchIndexedVersion = NULL WHERE d.folder IN :folders")
    void markStaleInFolders(@Param("folders") Collection<Folder> folders);

    @Modifying
    @Query("UPDATE Document d SET d.searchIndexedVersion = NULL")
    void markAllStale();
}
