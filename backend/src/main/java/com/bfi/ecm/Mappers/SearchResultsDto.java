package com.bfi.ecm.Mappers;

import java.util.List;
import java.util.Map;

public record SearchResultsDto(
        long total,
        int page,
        int size,
        List<SearchHitDto> hits,
        Map<String, List<FacetBucket>> facets) {
}
