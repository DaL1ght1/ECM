package com.bfi.ecm.Repository;

import com.bfi.ecm.Entities.Folder;
import com.bfi.ecm.Entities.FolderPermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface FolderPermissionRepository extends JpaRepository<FolderPermission, Long> {

    List<FolderPermission> findByFolder(Folder folder);

    @Modifying
    @Query("DELETE FROM FolderPermission p WHERE p.folder IN :folders")
    void deleteByFolderIn(@Param("folders") Collection<Folder> folders);
}
