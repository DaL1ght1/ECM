package com.bfi.ecm.Requests;


import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class RegistrationRequest {

    @NotEmpty(message = "First Name is mandatory ")
    @NotBlank(message = "First Name is mandatory ")
    private String name;
    @NotEmpty(message = "Last Name is mandatory ")
    @NotBlank(message = "Last Name is mandatory ")
    private String lastName;
    @Email(message = "Email is not well formatted")
    @NotEmpty(message = "Email is mandatory ")
    @NotBlank(message = "Email is mandatory ")
    private String email;
    @NotEmpty(message = "Password is mandatory ")
    @NotBlank(message = "Password is mandatory ")
    @Size(min = 8, message = "Password should be at least 8 characters")
    private String password;
    private LocalDate dateOfBirth;
    private boolean accountLocked;
    private boolean enabled;
    private String gender;
    private String address;
    private String phone;
    private String role;

}
