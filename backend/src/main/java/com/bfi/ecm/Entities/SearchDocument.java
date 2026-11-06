package com.bfi.ecm.Entities;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Mapping;
import org.springframework.data.elasticsearch.annotations.Setting;
import org.springframework.data.elasticsearch.annotations.WriteTypeHint;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@org.springframework.data.elasticsearch.annotations.Document(
        indexName = "#{@searchIndexName}",
        createIndex = false,
        writeTypeHint = WriteTypeHint.FALSE)
@Setting(settingPath = "elasticsearch/document-settings.json")
@Mapping(mappingPath = "elasticsearch/document-mappings.json")
public class SearchDocument {

    @Id
    private String id;
    private int versionNumber;
    private String title;
    private String content;
    private String folderId;
    private List<String> folderAncestors;
    private String folderPath;
    private String ownerId;
    private List<String> allowedPrincipals;
    private String mimeType;
    private long size;
    private long updatedAt;
}
