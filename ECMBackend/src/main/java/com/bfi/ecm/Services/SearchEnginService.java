package com.bfi.ecm.Services;

import com.bfi.ecm.Entities.File;

import java.util.List;

public interface SearchEnginService {
    List<File> findFileByWord(String mot);
}
