package com.bfi.ecm.Controllers;

import com.bfi.ecm.Mappers.SearchResultsDto;
import com.bfi.ecm.Services.SearchService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
@Validated
@Tag(name = "Search")
public class SearchController {

    private final SearchService searchService;

    @GetMapping
    public SearchResultsDto search(@RequestParam @NotBlank @Size(max = 200) String q,
                                   @RequestParam(required = false) String folderId,
                                   @RequestParam(required = false) String type,
                                   @RequestParam(defaultValue = "0") @Min(0) @Max(500) int page,
                                   @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return searchService.search(q, folderId, type, page, size);
    }
}
