package com.bfi.ecm.Responces;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder

public class AuthenticationResponse {
    private String token;
    private boolean approved;
    private String role;
    private boolean accountLocked;
}
