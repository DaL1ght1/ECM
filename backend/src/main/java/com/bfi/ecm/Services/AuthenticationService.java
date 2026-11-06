package com.bfi.ecm.Services;

import com.bfi.ecm.Requests.AuthenticationRequest;
import com.bfi.ecm.Requests.RegistrationRequest;
import com.bfi.ecm.Responces.AuthenticationResponse;
import jakarta.mail.MessagingException;

import java.io.IOException;

public interface AuthenticationService {
    void register(RegistrationRequest request) throws MessagingException, IOException;

    String getUserRole(String email);

    boolean isEnabled(String email);

    AuthenticationResponse authenticate(AuthenticationRequest request);

    void activateAccount(String token) throws MessagingException, IOException;
}
