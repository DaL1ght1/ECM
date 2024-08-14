package com.bfi.ecm.Controllers;

import com.bfi.ecm.Entities.File;
import com.bfi.ecm.Services.ServicesImpl.SearchEnginServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/bfi/v1/search")
public class SearchEngineController {

    private final SearchEnginServiceImpl searchEngineService;

    @Autowired
    public SearchEngineController(SearchEnginServiceImpl searchEngineService) {
        this.searchEngineService = searchEngineService;
    }

    @GetMapping
    public ResponseEntity<Map<Long, String>> findFiles(@RequestParam("mot") String mot) {
        List<File> files = searchEngineService.findFileByWord(mot);
        Map<Long, String> fileIdNameMap = files.stream()
                .collect(Collectors.toMap(File::getId, File::getName));
        if (files.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(fileIdNameMap);
    }
}

