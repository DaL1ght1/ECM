package com.bfi.ecm.Enums;

public enum AccessLevel {
    READ,
    WRITE;

    public boolean includes(AccessLevel required) {
        return this.ordinal() >= required.ordinal();
    }
}
