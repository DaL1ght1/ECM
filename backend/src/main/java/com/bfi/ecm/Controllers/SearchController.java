package com.bfi.ecm.Controllers;

import com.bfi.ecm.Mappers.DocumentDto;
import com.bfi.ecm.Services.DocumentService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
@Validated
@Tag(name = "Search")
public class SearchController {

    private final DocumentService documentService;

    @GetMapping
    public List<DocumentDto> search(@RequestParam @NotBlank String q,
                                    @RequestParam(defaultValue = "20") @Min(1) @Max(100) int limit) {
        return documentService.searchByName(q, limit);
    }
}
