package com.bfi.ecm.Controllers;

import com.bfi.ecm.Entities.Directory;
import com.bfi.ecm.Mappers.DirectoryDTO;
import com.bfi.ecm.Services.ServicesImpl.DirectoryServicesImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Comparator;


@RestController
@RequestMapping("bfi/v1/directories")
public class DirectoryController {

    private final DirectoryServicesImpl directoryServices;


    @Autowired
    public DirectoryController(DirectoryServicesImpl directoryServices) {
        this.directoryServices = directoryServices;
    }

    @GetMapping("getpath")
    public ResponseEntity<String> getPath(@RequestParam Long id) {
        try {
            String path = directoryServices.getDirectoryById(id).getPath();
            return ResponseEntity.ok(path);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Not Found");
        }
    }

    @PostMapping("/create")
    public ResponseEntity<String> createDirectory(@RequestBody DirectoryDTO directoryDTO) {
        // Validate the request
        if (directoryDTO.getName() == null || directoryDTO.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Directory name cannot be empty");
        }

        // Check if directory or file with the same name exists
        Long parentId = directoryDTO.getParent() != null ? directoryDTO.getParent().getId() : null;
        boolean exists = directoryServices.existsByNameAndParentId(directoryDTO.getName(), parentId);

        if (exists) {
            // Provide a more detailed message depending on what exactly exists
            boolean isDirectory = directoryServices.isDirectoryExists(directoryDTO.getName(), parentId);
            if (isDirectory) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body("A directory with the same name already exists");
            } else {
                return ResponseEntity.status(HttpStatus.CONFLICT).body("A file with the same name already exists");
            }
        }

        // Create and save the new directory
        try {
            directoryServices.saveDirectory(DirectoryDTO.toEntity(directoryDTO));

            Path parentPath = parentId != null ? Paths.get(directoryServices.getPathById(parentId)) : Paths.get("fileDirectory");
            Path newDirPath = parentPath.resolve(directoryDTO.getName());
            if (!Files.exists(newDirPath)) {
                Files.createDirectories(newDirPath);
            }
            return ResponseEntity.ok("Directory created successfully");
        } catch (Exception e) {
            // Log the exception and return a generic error message
            // Adjust the logging level and message as needed
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("An error occurred while creating the directory");
        }
    }


    @PutMapping("/update/{id}")
    public ResponseEntity<String> updateDirectoryName(
            @PathVariable("id") Long id,
            @RequestParam("name") String name) {
        try {
            directoryServices.updateDirectoryName(id, name);
            return ResponseEntity.ok("Directory updated successfully");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to update directory");
        }
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<?> deleteDirectory(@PathVariable("id") Long id) {
        try {
            // Get the directory
            Directory directory = directoryServices.getDirectoryById(id);
            if (directory == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Directory not found");
            }

            // Get the path of the directory
            Path dirPath = Paths.get(directory.getPath());

            // Delete the directory and its contents from the file system
            Files.walk(dirPath)
                    .sorted(Comparator.reverseOrder())
                    .map(Path::toFile)
                    .forEach(File::delete);

            // Delete the directory and its contents from the database
            directoryServices.deleteDirectoryAndContents(id);

            return ResponseEntity.ok("Directory and its contents deleted successfully");
        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error deleting directory from file system: " + e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error deleting directory: " + e.getMessage());
        }
    }

}
