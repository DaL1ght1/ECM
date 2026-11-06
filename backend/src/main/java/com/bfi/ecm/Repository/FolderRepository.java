package com.bfi.ecm.Repository;

import com.bfi.ecm.Entities.Folder;
import com.bfi.ecm.Entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FolderRepository extends JpaRepository<Folder, Long> {

    Optional<Folder> findByUuid(String uuid);

    List<Folder> findByParentOrderByNameAsc(Folder parent);

    List<Folder> findByParentIsNullOrderByNameAsc();

    List<Folder> findByParentIsNullAndOwnerOrderByNameAsc(User owner);

    boolean existsByParentAndNameIgnoreCase(Folder parent, String name);

    boolean existsByParentIsNullAndOwnerAndNameIgnoreCase(User owner, String name);

    @Query("""
            SELECT DISTINCT p.folder FROM FolderPermission p
            WHERE (p.principalType = com.bfi.ecm.Enums.PrincipalType.USER AND p.principal = :uuid)
               OR (p.principalType = com.bfi.ecm.Enums.PrincipalType.ROLE AND p.principal = :role)
            """)
    List<Folder> findSharedWith(@Param("uuid") String uuid, @Param("role") String role);
}
