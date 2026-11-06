package com.bfi.ecm.Mappers;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class AuthDTO {
    @NotNull
    @Email
    private String email;
    @NotNull
    @Size(min = 8, max = 100)
    private String password;
    private String role;
    private boolean approved;
    private String token;
    private String message;

}