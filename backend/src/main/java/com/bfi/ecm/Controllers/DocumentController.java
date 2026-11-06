package com.bfi.ecm.Controllers;

import com.bfi.ecm.Mappers.DocumentContent;
import com.bfi.ecm.Mappers.DocumentDto;
import com.bfi.ecm.Mappers.DocumentVersionDto;
import com.bfi.ecm.Requests.MoveRequest;
import com.bfi.ecm.Requests.RenameRequest;
import com.bfi.ecm.Services.DocumentService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.InvalidMediaTypeException;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/v1/documents")
@RequiredArgsConstructor
@Tag(name = "Documents")
public class DocumentController {

    private static final Set<String> INLINE_SAFE_TYPES = Set.of(
            "application/pdf", "text/plain", "image/png", "image/jpeg", "image/gif", "image/webp");

    private final DocumentService documentService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentDto> upload(@RequestParam("file") MultipartFile file,
                                              @RequestParam(value = "folderId", required = false) String folderId,
                                              @RequestParam(value = "comment", required = false) String comment) {
        return withEtag(HttpStatus.CREATED, documentService.upload(file, folderId, comment));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DocumentDto> get(@PathVariable String id) {
        return withEtag(HttpStatus.OK, documentService.get(id));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<DocumentDto> rename(@PathVariable String id, @RequestBody @Valid RenameRequest request) {
        return withEtag(HttpStatus.OK, documentService.rename(id, request.name()));
    }

    @PostMapping("/{id}/move")
    public ResponseEntity<DocumentDto> move(@PathVariable String id, @RequestBody MoveRequest request) {
        return withEtag(HttpStatus.OK, documentService.move(id, request.targetFolderId()));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        documentService.delete(id);
    }

    @GetMapping("/{id}/versions")
    public List<DocumentVersionDto> versions(@PathVariable String id) {
        return documentService.versions(id);
    }

    @PostMapping(value = "/{id}/versions", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentDto> addVersion(@PathVariable String id,
                                                  @RequestParam("file") MultipartFile file,
                                                  @RequestParam(value = "comment", required = false) String comment,
                                                  @RequestHeader(value = HttpHeaders.IF_MATCH, required = false) String ifMatch) {
        return withEtag(HttpStatus.OK, documentService.addVersion(id, file, comment, parseEtag(ifMatch)));
    }

    @PostMapping("/{id}/versions/{versionNumber}/restore")
    public ResponseEntity<DocumentDto> restoreVersion(@PathVariable String id, @PathVariable int versionNumber) {
        return withEtag(HttpStatus.OK, documentService.restoreVersion(id, versionNumber));
    }

    @GetMapping("/{id}/content")
    public ResponseEntity<Resource> content(@PathVariable String id,
                                            @RequestParam(defaultValue = "false") boolean download) {
        return toResponse(documentService.content(id, null), download);
    }

    @GetMapping("/{id}/versions/{versionNumber}/content")
    public ResponseEntity<Resource> versionContent(@PathVariable String id,
                                                   @PathVariable int versionNumber,
                                                   @RequestParam(defaultValue = "false") boolean download) {
        return toResponse(documentService.content(id, versionNumber), download);
    }

    private static ResponseEntity<DocumentDto> withEtag(HttpStatus status, DocumentDto document) {
        return ResponseEntity.status(status)
                .eTag(String.valueOf(document.lockVersion()))
                .body(document);
    }

    private static Long parseEtag(String ifMatch) {
        if (ifMatch == null || ifMatch.isBlank()) {
            return null;
        }
        String value = ifMatch.trim().replaceFirst("^W/", "").replace("\"", "");
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "If-Match must be the document ETag");
        }
    }

    private static ResponseEntity<Resource> toResponse(DocumentContent content, boolean download) {
        boolean inline = !download && INLINE_SAFE_TYPES.contains(content.mimeType());
        ContentDisposition disposition = (inline ? ContentDisposition.inline() : ContentDisposition.attachment())
                .filename(content.fileName(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .contentType(mediaType(content.mimeType()))
                .contentLength(content.size())
                .eTag(content.sha256())
                .cacheControl(CacheControl.noCache().cachePrivate())
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .header("Content-Security-Policy", "sandbox")
                .body(content.resource());
    }

    private static MediaType mediaType(String mimeType) {
        try {
            return MediaType.parseMediaType(mimeType);
        } catch (InvalidMediaTypeException e) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }
}
