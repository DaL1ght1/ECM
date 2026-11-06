package com.bfi.ecm.Controllers;

import com.bfi.ecm.Mappers.FolderContentsDto;
import com.bfi.ecm.Mappers.FolderDto;
import com.bfi.ecm.Mappers.PermissionDto;
import com.bfi.ecm.Requests.CreateFolderRequest;
import com.bfi.ecm.Requests.MoveRequest;
import com.bfi.ecm.Requests.RenameRequest;
import com.bfi.ecm.Requests.UpdatePermissionsRequest;
import com.bfi.ecm.Services.FolderService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/folders")
@RequiredArgsConstructor
@Tag(name = "Folders")
public class FolderController {

    private final FolderService folderService;

    @GetMapping
    public FolderContentsDto root() {
        return folderService.root();
    }

    @GetMapping("/shared")
    public List<FolderDto> shared() {
        return folderService.sharedWithMe();
    }

    @GetMapping("/{id}")
    public FolderContentsDto contents(@PathVariable String id) {
        return folderService.contents(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FolderDto create(@RequestBody @Valid CreateFolderRequest request) {
        return folderService.create(request);
    }

    @PatchMapping("/{id}")
    public FolderDto rename(@PathVariable String id, @RequestBody @Valid RenameRequest request) {
        return folderService.rename(id, request.name());
    }

    @PostMapping("/{id}/move")
    public FolderDto move(@PathVariable String id, @RequestBody MoveRequest request) {
        return folderService.move(id, request.targetFolderId());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        folderService.delete(id);
    }

    @GetMapping("/{id}/permissions")
    public List<PermissionDto> permissions(@PathVariable String id) {
        return folderService.permissions(id);
    }

    @PutMapping("/{id}/permissions")
    public List<PermissionDto> replacePermissions(@PathVariable String id, @RequestBody @Valid UpdatePermissionsRequest request) {
        return folderService.replacePermissions(id, request.permissions());
    }
}
