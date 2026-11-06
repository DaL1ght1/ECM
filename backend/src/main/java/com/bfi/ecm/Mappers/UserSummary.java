package com.bfi.ecm.Mappers;

import com.bfi.ecm.Entities.User;

public record UserSummary(String id, String name, String email) {

    public static UserSummary fromEntity(User user) {
        return new UserSummary(user.getUuid(), user.getFullName(), user.getEmail());
    }
}
