package com.bfi.ecm.Mappers;

import com.bfi.ecm.Entities.Directory;
import com.bfi.ecm.Entities.File;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Data
@Getter
@Setter
@Builder
public class DirectoryDTO {
    private List<File> files;
    private String name;
    private String path;
    private Directory parent;

    public static DirectoryDTO fromEntity(Directory directory) {
        if (directory == null) {
            return null;
        } else {
            return DirectoryDTO.builder()
                    .name(directory.getName())
                    .path(directory.getPath())
                    .files(directory.getFiles())
                    .parent(directory.getParent())
                    .build();
        }
    }

    public static Directory toEntity(DirectoryDTO directoryDTO) {
        if (directoryDTO == null) {
            return null;
        } else {
            Directory directory = new Directory();
            directory.setName(directoryDTO.getName());
            directory.setPath(directoryDTO.getPath());
            directory.setFiles(directoryDTO.getFiles());
            directory.setParent(directoryDTO.getParent());
            return directory;
        }
    }
}
