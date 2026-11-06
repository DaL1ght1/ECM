package com.bfi.ecm.Mappers;

import java.util.List;
import java.util.Map;

public record SearchHitDto(DocumentDto document, float score, Map<String, List<String>> highlights) {
}
