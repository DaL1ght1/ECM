package com.bfi.ecm.Services.ServicesImpl;

import com.bfi.ecm.Entities.File;
import com.bfi.ecm.Entities.SearchEngine;
import com.bfi.ecm.Services.SearchEnginService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SearchEnginServiceImpl implements SearchEnginService {

    private final SearchEngine searchEngine;

    @Autowired
    public SearchEnginServiceImpl(SearchEngine searchEngine) {
        this.searchEngine = searchEngine;
    }

    @Override
    public List<File> findFileByWord(String mot) {
        return searchEngine.findFileByWord(mot);
    }
}