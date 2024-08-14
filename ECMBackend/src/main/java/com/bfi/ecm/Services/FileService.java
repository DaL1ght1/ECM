package com.bfi.ecm.Services;

import com.bfi.ecm.Entities.File;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

public interface FileService {

    List<File> GetAllFiles();

    void SaveFile(File file);
    

    File findFileById(Long id);

    void deleteFile(Long id);

    File updateFile(MultipartFile multipartFile, String newFileName);

    String readFile(String filePath) throws IOException;
}
