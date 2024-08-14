package com.bfi.ecm.Repository;

import com.bfi.ecm.Entities.Directory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


@Repository
public interface DirectoryRepository extends JpaRepository<Directory, Long> {

    boolean existsByNameAndParentId(String name, Long parentId);

    void deleteById(Long Id);


}
