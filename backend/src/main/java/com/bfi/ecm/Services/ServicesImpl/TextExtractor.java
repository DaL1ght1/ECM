package com.bfi.ecm.Services.ServicesImpl;

import com.bfi.ecm.Configurations.SearchProperties;
import org.apache.tika.Tika;
import org.apache.tika.exception.TikaException;
import org.apache.tika.metadata.Metadata;
import org.apache.tika.metadata.TikaCoreProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;

@Service
public class TextExtractor {

    private static final Logger log = LoggerFactory.getLogger(TextExtractor.class);

    private final Tika tika = new Tika();

    public TextExtractor(SearchProperties searchProperties) {
        tika.setMaxStringLength(searchProperties.maxContentChars());
    }

    public String extract(Resource resource, String fileName) {
        Metadata metadata = new Metadata();
        metadata.set(TikaCoreProperties.RESOURCE_NAME_KEY, fileName);
        try (InputStream in = resource.getInputStream()) {
            return tika.parseToString(in, metadata);
        } catch (IOException | TikaException | RuntimeException e) {
            log.warn("Could not extract text from {}: {}", fileName, e.toString());
            return "";
        }
    }
}
