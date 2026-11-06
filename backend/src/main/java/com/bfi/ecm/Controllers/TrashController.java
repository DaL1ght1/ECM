package com.bfi.ecm.Controllers;

import com.bfi.ecm.Mappers.DocumentDto;
import com.bfi.ecm.Services.DocumentService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/trash")
@RequiredArgsConstructor
@Tag(name = "Trash")
public class TrashController {

    private final DocumentService documentService;

    @GetMapping
    public List<DocumentDto> list() {
        return documentService.trash();
    }

    @PostMapping("/{id}/restore")
    public DocumentDto restore(@PathVariable String id) {
        return documentService.restoreFromTrash(id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void purge(@PathVariable String id) {
        documentService.purge(id);
    }
}
