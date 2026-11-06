package com.bfi.ecm.Events;

import java.util.Collection;
import java.util.Set;

public record SearchIndexEvent(Set<String> documentIds) {

    public static SearchIndexEvent of(String documentId) {
        return new SearchIndexEvent(Set.of(documentId));
    }

    public static SearchIndexEvent of(Collection<String> documentIds) {
        return new SearchIndexEvent(Set.copyOf(documentIds));
    }
}
