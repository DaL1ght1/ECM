package com.bfi.ecm.Services;

import com.bfi.ecm.Mappers.SearchResultsDto;

public interface SearchService {

    SearchResultsDto search(String query, String folderId, String mimeType, int page, int size);
}
