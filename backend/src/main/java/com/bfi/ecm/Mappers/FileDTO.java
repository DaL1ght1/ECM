package com.bfi.ecm.Mappers;

import com.bfi.ecm.Entities.File;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FileDTO {
    private Long parentFileId;
    private String name;
    private String fileType;
    private Long size;
    private String path;


    public static FileDTO fromEntity(File file) {
        if (file == null) {
            return null;
        }
        return FileDTO.builder()

                .name(file.getName())
                .fileType(file.getFileType())
                .size(file.getSize())
                .path(file.getPath())
                .build();
    }

    public File toEntity() {
        File file = new File();
        file.setName(this.getName());
        file.setFileType(this.getFileType());
        file.setSize(this.getSize());
        file.setPath(this.getPath());

        return file;
    }
}
