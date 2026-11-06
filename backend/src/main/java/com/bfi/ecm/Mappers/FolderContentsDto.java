package com.bfi.ecm.Mappers;

import java.util.List;

public record FolderContentsDto(
        FolderDto folder,
        List<FolderDto> breadcrumbs,
        List<FolderDto> folders,
        List<DocumentDto> documents) {
}
