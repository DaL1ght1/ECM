package com.bfi.ecm.Controllers;


import com.bfi.ecm.Configurations.FileStorageProperties;
import com.bfi.ecm.Entities.Directory;
import com.bfi.ecm.Entities.File;
import com.bfi.ecm.Mappers.DirectoryDTO;
import com.bfi.ecm.Mappers.FileDTO;
import com.bfi.ecm.Repository.FileRepository;
import com.bfi.ecm.Requests.MoveFileRequest;
import com.bfi.ecm.Services.ServicesImpl.DirectoryServicesImpl;
import com.bfi.ecm.Services.ServicesImpl.FileServicesImpl;
import com.bfi.ecm.Services.ServicesImpl.FileStorageServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.net.URLConnection;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.*;

@RestController
@RequestMapping("/bfi/v1/files")
@RequiredArgsConstructor
public class FileStorageController {


    private final FileStorageServiceImpl fileStorageService;
    private final FileServicesImpl fileServices;
    private final DirectoryServicesImpl directoryServices;
    private final FileStorageProperties fileStorageProperties;
    private final FileStorageServiceImpl fileStorageServiceImpl;
    private final FileRepository fileRepository;


    @PostMapping("/upload")
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file,
                                        @RequestParam(value = "id", required = false) Long parentFileId) {
        try {
            Path baseDir = Paths.get(fileStorageProperties.getUploadDir()).toAbsolutePath().normalize();

            Directory parentDirectory = null;
            if (parentFileId != null) {
                parentDirectory = directoryServices.getDirectoryById(parentFileId);
                if (parentDirectory == null) {
                    return ResponseEntity.badRequest().body("Parent directory not found.");
                }
            }

            Path destinationPath;
            if (parentDirectory != null) {
                Path relativePath = Paths.get(parentDirectory.getPath()).toAbsolutePath().normalize();
                destinationPath = relativePath.resolve(Objects.requireNonNull(file.getOriginalFilename()));
            } else {
                destinationPath = baseDir.resolve(Objects.requireNonNull(file.getOriginalFilename()));
            }

            String destinationPathString = destinationPath.toString().replace("\\", "/");
            destinationPath = Paths.get(destinationPathString);
            // Ensure the path is still within the allowed directory
            if (!destinationPath.startsWith(baseDir)) {
                throw new SecurityException("Cannot store file outside of the designated upload directory.");
            }

            // Create directories if they don't exist
            Files.createDirectories(destinationPath.getParent());
            Path Base = Paths.get("C:/Users/khali/IdeaProjects/ECM/").toAbsolutePath().normalize();

            Files.copy(file.getInputStream(), destinationPath, StandardCopyOption.REPLACE_EXISTING);

            // Create FileDTO and save
            FileDTO fileDTO = FileDTO.builder()
                    .name(file.getOriginalFilename())
                    .parentFileId(parentFileId)
                    .fileType(file.getContentType())
                    .size(file.getSize())
                    .path(Base.relativize(destinationPath).toString().replace("\\", "/"))
                    .build();

            File fileEntity = fileDTO.toEntity();
            fileEntity.setDirectory(parentDirectory);

            fileServices.saveToken(Files.readString(destinationPath), fileEntity);
            fileServices.SaveFile(fileEntity);

            if (parentDirectory != null) {
                parentDirectory.getFiles().add(fileEntity);
            }

            return ResponseEntity.ok().body(Map.of("message", "File uploaded and saved successfully"));

        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error processing file: " + e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Unexpected error: " + e.getMessage());
        }
    }


    @PutMapping("/{id}/move")
    public ResponseEntity<?> moveFile(@PathVariable("id") Long id,
                                      @RequestBody MoveFileRequest request) {
        try {
            fileStorageServiceImpl.moveFile(id, request.getNewParentFileId());
            return ResponseEntity.ok("File moved successfully");
        } catch (FileNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("File or directory not found: " + e.getMessage());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Invalid operation: " + e.getMessage());
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error moving file: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Unexpected error: " + e.getMessage());
        }
    }

    @GetMapping("all")
    public ResponseEntity<Map<String, Object>> getAllFilesAndDirectories() {
        List<File> files = fileServices.GetAllFiles();
        List<Directory> directories = directoryServices.GetAllDirectories();

        // Transforming entities to DTOs
        List<Map<String, Object>> fileDTOs = files.stream().map(file -> {
            Map<String, Object> fileMap = new HashMap<>();
            FileDTO fileDTO = FileDTO.fromEntity(file);
            fileMap.put("id", file.getId());
            fileMap.put("name", fileDTO.getName());
            fileMap.put("size", fileDTO.getSize());
            fileMap.put("filetype", fileDTO.getFileType());
            fileMap.put("path", fileDTO.getPath());
            if (file.getDirectory() != null) {
                fileMap.put("directory_id", file.getDirectory().getId());
            }
            return fileMap;
        }).toList();

        List<Map<String, Object>> directoryDTOs = directories.stream().map(directory -> {
            Map<String, Object> directoryMap = new HashMap<>();
            DirectoryDTO directoryDTO = DirectoryDTO.fromEntity(directory);
            directoryMap.put("id", directory.getId());
            directoryMap.put("name", directoryDTO.getName());
            directoryMap.put("path", directoryDTO.getPath());
            directoryMap.put("parent_id", directoryDTO.getParent().getId());
            if (directoryDTO.getParent() != null) {
                Map<String, Object> parentMap = new HashMap<>();
                parentMap.put("id", directoryDTO.getParent().getId());
                directoryMap.put("parent", parentMap);
            }

            return directoryMap;
        }).toList();

        // Creating the response map
        Map<String, Object> response = new HashMap<>();
        response.put("files", fileDTOs);
        response.put("directories", directoryDTOs);


        return ResponseEntity.ok(response);
    }


    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteFile(@PathVariable("id") Long id) {
        try {
            // Delete the file from the database and storage
            fileServices.deleteFile(id);

            return ResponseEntity.ok("File deleted successfully");
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error deleting file: " + e.getMessage());
        }
    }

    @PutMapping("/update/{id}")
    public ResponseEntity<?> updateFile(@PathVariable("id") Long id,
                                        @RequestParam(value = "file", required = false) MultipartFile newFile,
                                        @RequestParam(value = "newName", required = false) String newName,
                                        @RequestParam(value = "newParentFileId", required = false) Long newParentFileId) {
        try {
            // Retrieve the existing file entity
            File existingFile = fileServices.findFileById(id);
            if (existingFile == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("File not found");
            }

            String oldPath = existingFile.getPath();
            String newPath = oldPath;

            // Update the file content if a new file is provided
            if (newFile != null) {
                // Store the new file and update the file name
                Path tempFile = Files.createTempFile("upload", ".tmp");
                newFile.transferTo(tempFile.toFile());
                String newFileContent = fileServices.readFile(tempFile.toString());

                if (newParentFileId != null) {
                    Directory newParentDirectory = directoryServices.getDirectoryById(newParentFileId);
                    newPath = newParentDirectory.getPath() + "/" + (newName != null ? newName : existingFile.getName());
                    existingFile.setPath(newPath);
                    existingFile.setDirectory(newParentDirectory);
                } else {
                    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Invalid parent directory ID");
                }

                fileStorageService.storeFile(newFileContent, id, newName != null ? newName : existingFile.getName());
                existingFile.setName(newName != null ? newName : existingFile.getName());
                existingFile.setSize(newFile.getSize());
                existingFile.setFileType(newFile.getContentType());

                fileServices.saveToken(newFileContent, existingFile);
            } else {
                if (newParentFileId != null) {
                    Directory newParentDirectory = directoryServices.getDirectoryById(newParentFileId);
                    newPath = newParentDirectory.getPath() + "/" + (newName != null ? newName : existingFile.getName());
                    existingFile.setPath(newPath);
                    existingFile.setDirectory(newParentDirectory);
                }

                // Update the file name if provided
                if (newName != null && !newName.trim().isEmpty()) {
                    existingFile.setName(newName.trim());
                    newPath = existingFile.getDirectory().getPath() + "/" + newName.trim();
                    existingFile.setPath(newPath);
                }
            }

            // Move the file if the path has changed
            if (!oldPath.equals(newPath)) {
                Path source = Paths.get(oldPath);
                Path target = Paths.get(newPath);
                Files.move(source, target, StandardCopyOption.REPLACE_EXISTING);
            }

            // Save the updated file entity
            fileServices.SaveFile(existingFile);

            return ResponseEntity.ok(Collections.singletonMap("message", "File updated successfully"));

        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error updating file: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Unexpected error updating file: " + e.getMessage());
        }
    }

    @GetMapping("/content/{id}")
    public ResponseEntity<?> getFileContent(@PathVariable("id") Long id) {
        try {
            // Retrieve the file content from the file storage service
            String fileContent = fileStorageService.readFileContent(id);

            return ResponseEntity.ok().body(Map.of("fileContent", fileContent));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error retrieving file content: " + e.getMessage());
        }
    }

    @PostMapping("/replace/{id}")
    public ResponseEntity<?> replaceFile(@PathVariable("id") Long id,
                                         @RequestParam("content") String newFileContent) {
        try {
            // Retrieve the existing file entity
            File existingFile = fileServices.findFileById(id);
            if (existingFile == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("File not found");
            }

            // Delete the old file from storage
            Path oldFilePath = Paths.get(fileStorageService.getFilePath(existingFile.getId()));
            if (Files.exists(oldFilePath)) {
                Files.delete(oldFilePath);
            }

            // Delete old tokens associated with the file
            fileServices.deleteTokens(existingFile);

            // Create a temporary file for the new content
            Path tempFile = Files.createTempFile("upload", ".tmp");
            Files.write(tempFile, newFileContent.getBytes());

            // Store the new file and get the file name
            String newFileName = fileStorageService.storeFile(newFileContent, existingFile.getId(), existingFile.getName());


            String filetype = "text/plain"; // You can adjust this based on actual content type
            Long fileSize = Files.size(tempFile);
            Path Base = Paths.get("C:/Users/khali/IdeaProjects/ECM/").toAbsolutePath().normalize();
            Path filePath = Base.resolve(existingFile.getPath()).normalize();
            Path finalPath = Base.relativize(filePath).normalize().normalize();
            String toStringFile = finalPath.toString().replace("\\", "/");
            System.out.println(toStringFile);

            // Update File entity with new details
            existingFile.setName(newFileName);
            existingFile.setFileType(filetype);
            existingFile.setSize(fileSize);
            existingFile.setPath(toStringFile);

            // Save new tokens
            fileServices.saveToken(newFileContent, existingFile);

            // Save updated file entity
            fileServices.SaveFile(existingFile);

            return ResponseEntity.ok().body(Map.of("message", "File replaced successfully"));

        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error replacing file: " + e.getMessage());
        }
    }

    @GetMapping("/download/{fileId}")
    public ResponseEntity<Resource> getFile(@PathVariable Long fileId) {
        // Load the file as a resource
        Resource file = fileStorageServiceImpl.loadFileAsResource(fileId);

        // Find the file in your repository
        File f = fileRepository.findAllById(fileId);

        // Validate the file object
        if (f == null || file == null) {
            return ResponseEntity.notFound().build(); // Handle file not found
        }

        // Determine the file's MIME type using the file name if needed
        String mimeType = f.getFileType();
        if (mimeType == null || mimeType.isEmpty()) {
            mimeType = URLConnection.guessContentTypeFromName(f.getName());
            if (mimeType == null) {
                mimeType = "application/octet-stream"; // Default type for unknown types
            }
        }

        // Set the response headers
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(mimeType));
        headers.setContentDispositionFormData("attachment", f.getName());

        System.out.println("File Name: " + f.getName());
        System.out.println("MIME Type: " + mimeType);


        return ResponseEntity.ok()
                .headers(headers)
                .body(file);
    }


}

