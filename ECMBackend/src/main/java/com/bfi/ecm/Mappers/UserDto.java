package com.bfi.ecm.Mappers;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import lombok.Value;

import java.io.Serializable;
import java.time.LocalDate;

/**
 * DTO for {@link com.bfi.ecm.Entities.User}
 */
@Value
public class UserDto implements Serializable {
    String name;
    String lastName;
    @NotNull
    @Email
    String email;
    LocalDate dateOfBirth;
    String password;
    boolean accountLocked;
    boolean enabled;
    String gender;
    String address;
    String phone;
    String role;


}
