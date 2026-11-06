package com.bfi.ecm.Services;

import com.bfi.ecm.Requests.AuthenticationRequest;
import com.bfi.ecm.Requests.RegistrationRequest;
import com.bfi.ecm.Responces.AuthenticationResponse;
import jakarta.mail.MessagingException;

import java.io.IOException;

public interface AuthenticationService {
    void register(RegistrationRequest request) throws MessagingException, IOException;

    AuthSession authenticate(AuthenticationRequest request);

    AuthSession refresh(String refreshToken);

    void logout(String refreshToken);

    void activateAccount(String token) throws MessagingException, IOException;

    /** The JSON body for the client plus the raw refresh token, which goes into an HttpOnly cookie. */
    record AuthSession(AuthenticationResponse body, String refreshToken) {
    }
}
