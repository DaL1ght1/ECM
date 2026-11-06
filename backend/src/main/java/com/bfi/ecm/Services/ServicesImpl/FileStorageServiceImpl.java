package com.bfi.ecm.Services.ServicesImpl;

import com.bfi.ecm.Configurations.FileStorageProperties;
import com.bfi.ecm.Entities.Directory;
import com.bfi.ecm.Entities.File;
import com.bfi.ecm.Repository.DirectoryRepository;
import com.bfi.ecm.Repository.FileRepository;
import com.bfi.ecm.Services.FileStorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

@Service
public class FileStorageServiceImpl implements FileStorageService {

    private final FileRepository fileRepository;
    private final DirectoryRepository directoryRepository;
    @Value("${path.base}")
    String base;

    @Autowired
    public FileStorageServiceImpl(FileStorageProperties fileStorageProperties, FileRepository fileRepository, DirectoryRepository directoryRepository) {
        this.fileRepository = fileRepository;
        this.directoryRepository = directoryRepository;
        Path fileStorageLocation = Paths.get(fileStorageProperties.getUploadDir())
                .toAbsolutePath().normalize();

        try {
            Files.createDirectories(fileStorageLocation);
        } catch (Exception ex) {
            throw new RuntimeException("Could not create the directory where the uploaded files will be stored.", ex);
        }
    }

    @Override
    public String storeFile(String content, Long id, String name) throws IOException {
        if (fileRepository.findById(id).isPresent()) {
            File file = fileRepository.findById(id).get();
            Path Base = Paths.get(base).toAbsolutePath().normalize();
            Path filePath = Base.resolve(file.getPath()).normalize();
            Files.write(filePath, content.getBytes());
            return file.getName();
        }
        return null;
    }


    @Override
    public Resource loadFileAsResource(Long id) {
        File file;
        if (fileRepository.findById(id).isPresent()) {
            file = fileRepository.findById(id).get();
            try {
                Path Base = Paths.get(base).toAbsolutePath().normalize();
                Path filePath = Base.resolve(file.getPath()).normalize();
                Resource resource = new UrlResource(filePath.toUri());
                if (resource.exists()) {
                    return resource;
                } else {
                    throw new RuntimeException("File not found " + file.getName());
                }
            } catch (MalformedURLException ex) {
                throw new RuntimeException("File not found " + file.getName(), ex);
            }
        }
        return null;
    }

    public String readFileContent(Long id) throws IOException {
        if (fileRepository.findById(id).isPresent()) {
            File file = fileRepository.findById(id).get();

            Path Base = Paths.get(base).toAbsolutePath().normalize();
            Path filePath = Base.resolve(file.getPath()).normalize();
            return new String(Files.readAllBytes(filePath));
        }
        return null;
    }

    public String getFilePath(Long id) {
        if (fileRepository.findById(id).isPresent()) {
            File file = fileRepository.findById(id).get();
            Path Base = Paths.get(base).toAbsolutePath().normalize();
            Path filePath = Base.resolve(file.getPath()).normalize();
            return filePath.toString();
        }
        return null;
    }


    public void moveFile(Long fileId, Long newParentDirectoryId) throws FileNotFoundException, IllegalArgumentException, IOException {
        File file = fileRepository.findById(fileId)
                .orElseThrow(() -> new FileNotFoundException("File not found with id: " + fileId));

        Directory newParentDirectory = directoryRepository.findById(newParentDirectoryId)
                .orElseThrow(() -> new FileNotFoundException("Directory not found with id: " + newParentDirectoryId));

        if (file.getDirectory().getId().equals(newParentDirectoryId)) {
            throw new IllegalArgumentException("File is already in the target directory");
        }

        // Check if the new path already exists
        Path newPath = Paths.get(newParentDirectory.getPath(), file.getName());
        if (Files.exists(newPath)) {
            throw new IllegalArgumentException("A file with the same name already exists in the target directory");
        }

        // Update the file's parent directory in the database
        file.setDirectory(newParentDirectory);

        // Update the file's path
        String oldPath = file.getPath();
        file.setPath(newPath.toString().replace("\\", "/"));

        // Move the actual file on the file system
        Path source = Paths.get(oldPath);
        Files.move(source, newPath, StandardCopyOption.ATOMIC_MOVE);

        // Save the updated file entity
        fileRepository.save(file);
    }
}
