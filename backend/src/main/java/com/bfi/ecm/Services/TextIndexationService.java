package com.bfi.ecm.Services;

import com.bfi.ecm.Entities.Tokens;

import java.io.IOException;
import java.util.List;

public interface TextIndexationService {
    String readFile(String filePath) throws IOException;

    void saveToken(String text);

    List<Tokens> findBySoundexCode(String soundexCode);
}
