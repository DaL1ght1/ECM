package com.bfi.ecm.Controllers;


import com.bfi.ecm.Requests.AuthenticationRequest;
import com.bfi.ecm.Requests.RegistrationRequest;
import com.bfi.ecm.Responces.AuthenticationResponse;
import com.bfi.ecm.Responces.ErrorResponse;
import com.bfi.ecm.Services.ServicesImpl.AuthenticationServiceImpl;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.mail.MessagingException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;

@RestController
@RequestMapping("bfi/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication")
public class AuthenticationController {

    private final AuthenticationServiceImpl authService;

    @PostMapping("/register")
    public ResponseEntity<?> Register(@RequestBody @Valid RegistrationRequest request) throws MessagingException {
        try {
            authService.register(request);
            System.out.println("User registration successful");
        } catch (Exception ex) {
            System.err.println("Error during registration: " + ex.getMessage());
        }

        return ResponseEntity.accepted().build();
    }

    @PostMapping("/authenticate")
    public ResponseEntity<?> authenticate(@RequestBody @Valid AuthenticationRequest request) {
        try {
            AuthenticationResponse response = authService.authenticate(request);
            return ResponseEntity.ok(response);
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorResponse("Invalid email or password"));
        } catch (DisabledException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ErrorResponse("Account is disabled"));
        } catch (LockedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new ErrorResponse("Account is locked"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new ErrorResponse("An unexpected error occurred"));
        }
    }

    @GetMapping("activate-account")
    public void confirm(
            @RequestParam String token
    ) throws MessagingException, IOException {
        authService.activateAccount(token);
    }
}