package com.bfi.ecm.Services;

import com.bfi.ecm.Mappers.FolderContentsDto;
import com.bfi.ecm.Mappers.FolderDto;
import com.bfi.ecm.Mappers.PermissionDto;
import com.bfi.ecm.Requests.CreateFolderRequest;

import java.util.List;

public interface FolderService {

    FolderContentsDto root();

    FolderContentsDto contents(String folderId);

    List<FolderDto> sharedWithMe();

    FolderDto create(CreateFolderRequest request);

    FolderDto rename(String folderId, String name);

    FolderDto move(String folderId, String targetFolderId);

    void delete(String folderId);

    List<PermissionDto> permissions(String folderId);

    List<PermissionDto> replacePermissions(String folderId, List<PermissionDto> permissions);
}
