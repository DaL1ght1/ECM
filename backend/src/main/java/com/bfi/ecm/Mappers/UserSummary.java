package com.bfi.ecm.Mappers;

import com.bfi.ecm.Entities.User;

public record UserSummary(String id, String name, String email) {

    public static UserSummary fromEntity(User user) {
        String name = user.getName() == null ? user.getEmail() : user.getFullName();
        return new UserSummary(user.getUuid(), name, user.getEmail());
    }
}
