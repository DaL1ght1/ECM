package com.bfi.ecm.Services.ServicesImpl;

import com.bfi.ecm.Entities.File;
import com.bfi.ecm.Entities.Tokens;
import com.bfi.ecm.Repository.FileRepository;
import com.bfi.ecm.Repository.TokensRepository;
import com.bfi.ecm.Services.FileService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.apache.commons.codec.language.Soundex;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class FileServicesImpl implements FileService {

    public final FileRepository fileRepository;
    private final TokensRepository tokensRepository;
    private final TokensRepository tokenRepository;
    @Value("${path.base}")
    String base;


    @Override
    public List<File> GetAllFiles() {
        return fileRepository.findAll();
    }

    @Override
    public void SaveFile(File file) {
        fileRepository.save(file);
    }

    @Value("${file.storage.location:src/Filesdirectory}")
    private String fileStorageLocation;


    @Override
    public File findFileById(Long id) {
        return fileRepository.findAllById(id);
    }

    @Override
    public void deleteFile(Long id) {
        Optional<File> fileEntityOptional = fileRepository.findById(id);
        if (fileEntityOptional.isPresent()) {
            File fileEntity = fileEntityOptional.get();

            // Delete from storage
            try {
                Path Base = Paths.get(base).toAbsolutePath().normalize();

                String filePath = fileEntity.getPath();
                Path fullPath = Base.resolve(filePath);
                System.out.println(fullPath);
                Files.deleteIfExists(fullPath);
            } catch (IOException e) {
                // Log or handle the file deletion exception
                e.printStackTrace();
                // Consider throwing a custom exception or returning an error status
                throw new RuntimeException("Error deleting file from storage: " + e.getMessage());
            }

            // Delete from database
            fileRepository.delete(fileEntity);
        } else {
            throw new RuntimeException("File not found for id: " + id);
        }
    }

    @Override
    public File updateFile(MultipartFile multipartFile, String newFileName) {
        File newFile = new File();
        newFile.setName(newFileName);
        newFile.setFileType(multipartFile.getContentType());

        try {
            Path filePath = Paths.get(fileStorageLocation).resolve(newFileName).normalize();
            Files.copy(multipartFile.getInputStream(), filePath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ex) {
            throw new RuntimeException("Could not store file " + newFileName + ". Please try again!", ex);
        }

        fileRepository.save(newFile);
        return newFile;
    }

    @Override
    public String readFile(String filePath) throws IOException {
        StringBuilder content = new StringBuilder();
        try (BufferedReader br = new BufferedReader(new FileReader(filePath))) {
            String line;
            while ((line = br.readLine()) != null) {
                content.append(line).append("\n");
            }
        }
        return content.toString();
    }


    public void saveToken(String text, File file) {
        Soundex soundex = new Soundex();
        Arrays.stream(text.split("\\s+")).forEach(word -> {
            String soundexCode = soundex.encode(word);
            String noVowel = removeVowels(word);
            List<Tokens> tokensList = tokenRepository.findByText(word);
            if (!tokensList.isEmpty()) {
                file.getTokens().addAll(tokensList);
            } else {
                Tokens token = new Tokens();
                token.setText(word);
                token.setSoundexCode(soundexCode);
                token.setNoVowel(noVowel);

                token.getFiles().add(file);
                tokenRepository.save(token);
                file.getTokens().add(token);
            }
        });
    }

    private String removeVowels(String word) {
        return word.replaceAll("[AEIOUaeiou]", "");
    }

    @Transactional
    public void deleteTokens(File file) {
        // First, remove the association between File and Tokens
        file.getTokens().clear();
        fileRepository.save(file);  // This will update the join table

        // Now, delete any Tokens that are no longer associated with any Files
        tokensRepository.deleteOrphanTokens();
    }
}
