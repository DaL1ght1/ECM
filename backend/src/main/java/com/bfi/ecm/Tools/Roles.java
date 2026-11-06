package com.bfi.ecm.Tools;

import java.util.Set;

public final class Roles {

    public static final String ADMIN = "ADMIN";
    public static final Set<String> ASSIGNABLE = Set.of("USER", "SECURITY", "HR", "ENGINEER", "MANAGER", ADMIN);

    private Roles() {
    }
}
