package com.bfi.ecm.Mappers;

import com.bfi.ecm.Entities.User;

import java.io.Serializable;
import java.time.LocalDate;

/**
 * Public view of {@link User}. Never includes the password hash.
 */
public record UserDto(
        Long id,
        String uuid,
        String name,
        String lastName,
        String email,
        LocalDate dateOfBirth,
        String gender,
        String address,
        String phone,
        String role,
        boolean enabled,
        boolean accountLocked) implements Serializable {

    public static UserDto fromEntity(User user) {
        return new UserDto(
                user.getId(),
                user.getUuid(),
                user.getName(),
                user.getLastName(),
                user.getEmail(),
                user.getDateOfBirth(),
                user.getGender(),
                user.getAddress(),
                user.getPhone(),
                user.getRole(),
                user.isEnabled(),
                user.isAccountLocked());
    }
}
