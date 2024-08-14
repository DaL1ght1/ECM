package com.bfi.ecm.Repository;

import com.bfi.ecm.Entities.File;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FileRepository extends JpaRepository<File, Long> {

    File findAllById(Long id);

    boolean existsByNameAndDirectory_Id(String name, Long parentId);


}




