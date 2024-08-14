package com.bfi.ecm.Mappers;

import com.bfi.ecm.Entities.File;
import lombok.Value;

import java.io.Serializable;
import java.util.Set;

/**
 * DTO for {@link com.bfi.ecm.Entities.Tokens}
 */
@Value
public class TokensDto implements Serializable {
    String text;
    String soundexCode;
    String NoVowel;
    Set<File> files;
}