package com.bfi.ecm.Services.ServicesImpl;

import com.bfi.ecm.Entities.Directory;
import com.bfi.ecm.Entities.File;
import com.bfi.ecm.Repository.DirectoryRepository;
import com.bfi.ecm.Repository.FileRepository;
import com.bfi.ecm.Services.DirectoryServices;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;


@Service
@RequiredArgsConstructor
public class DirectoryServicesImpl implements DirectoryServices {

    public final DirectoryRepository directoryRepository;
    public FileRepository fileRepository;
    public final FileServicesImpl fileServices;

    @Override
    public Directory getDirectoryById(Long id) {
        return directoryRepository.findById(id).orElse(null);
    }

    public List<Directory> GetAllDirectories() {
        return directoryRepository.findAll();
    }

    @Transactional
    public void saveDirectory(Directory directory) {
        if (directory.getParent() != null) {
            Directory parent = directoryRepository.findById(directory.getParent().getId())
                    .orElseThrow(() -> new RuntimeException("Parent directory not found"));

            directory.setPath(parent.getPath() + "/" + directory.getName());
            parent.getChildren().add(directory);
            directory.setParent(parent);

            // Log the state
            System.out.println("Saving directory with parent ID: " + directory.getParent().getId());
        } else {
            directory.setPath(directory.getName());
        }

        // Save the directory to the database
        directoryRepository.save(directory);
    }

    public String getPathById(Long id) {
        if (directoryRepository.findById(id).isPresent()) {
            return directoryRepository.findById(id).get().getPath();
        } else {
            return null;
        }
    }

    @Override
    public void updateDirectory(Directory directory) {
        directoryRepository.save(directory);
    }

    public boolean isDirectoryExists(String name, Long parentId) {
        // Adjust this query according to your database schema
        return directoryRepository.existsByNameAndParentId(name, parentId);
    }

    public void updateDirectoryName(Long id, String name) {
        Directory directory = directoryRepository.findById(id).orElseThrow(() -> new RuntimeException("Directory not found"));
        directory.setName(name);
        directoryRepository.save(directory);
    }

    public boolean existsByNameAndParentId(String name, Long parentId) {
        return directoryRepository.existsByNameAndParentId(name, parentId) ||
                fileRepository.existsByNameAndDirectory_Id(name, parentId);
    }

    @Override
    public void deleteDirectory(Directory directory) {
        directoryRepository.delete(directory);

    }

    @Transactional
    public void deleteDirectoryAndContents(Long id) {
        Directory directory = getDirectoryById(id);
        if (directory != null) {
            // Recursively delete child directories
            List<Directory> childDirectories = new ArrayList<>(directory.getChildren());
            for (Directory childDir : childDirectories) {
                deleteDirectoryAndContents(childDir.getId());
            }

            // Delete files in this directory
            List<File> files = new ArrayList<>(directory.getFiles());
            for (File file : files) {
                fileServices.deleteFile(file.getId());  // Assuming you have a fileServices with a deleteFile method
            }

            // Remove this directory from its parent's children list
            if (directory.getParent() != null) {
                directory.getParent().getChildren().remove(directory);
            }

            // Delete the directory itself
            directoryRepository.delete(directory);
        }
    }


}
