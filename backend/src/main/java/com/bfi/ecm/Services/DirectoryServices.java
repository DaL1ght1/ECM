package com.bfi.ecm.Services;

import com.bfi.ecm.Entities.Directory;

public interface DirectoryServices {
    public Directory getDirectoryById(Long id);


    public void saveDirectory(Directory directory);

    public void updateDirectory(Directory directory);

    public void deleteDirectory(Directory directory);


}
