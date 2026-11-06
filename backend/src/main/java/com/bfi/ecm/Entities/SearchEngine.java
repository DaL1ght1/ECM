package com.bfi.ecm.Entities;

import com.bfi.ecm.Repository.FileRepository;
import com.bfi.ecm.Repository.TokensRepository;
import lombok.RequiredArgsConstructor;
import org.apache.commons.codec.language.Soundex;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class SearchEngine {

    private final TokensRepository tokenRepository;
    private final FileRepository fileRepository;

    public List<File> findFileByWord(String mot) {
        String soundexCode = new Soundex().encode(mot);

        List<Tokens> tokensBySoundex = tokenRepository.findBySoundexCode(soundexCode);
        List<Tokens> tokensByText = tokenRepository.findByTextContainingIgnoreCase(mot);
        List<Tokens> tokensByNewToken = tokenRepository.findByNewTokenContainingIgnoreCase(mot);

        Set<Tokens> allTokens = new HashSet<>();
        allTokens.addAll(tokensBySoundex);
        allTokens.addAll(tokensByText);
        allTokens.addAll(tokensByNewToken);

        Set<Long> fileIds = allTokens.stream()
                .flatMap(token -> token.getFiles().stream())
                .map(File::getId)
                .collect(Collectors.toSet());
        return fileRepository.findAllById(fileIds);
    }
}