package com.bfi.ecm.Enums;

import lombok.Getter;

@Getter
public enum EmailTemplateName {
    ACTIVATE_ACCOUNT("activate_account"),
    WELCOME_EMAIL("welcome_email"),
    REJECTED_EMAIL("rejected_email"),
    PENDING_REQUEST("pending_for_approval");

    private final String name;

    EmailTemplateName(String name) {
        this.name = name;
    }
}