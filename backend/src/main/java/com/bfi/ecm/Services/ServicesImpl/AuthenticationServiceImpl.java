package com.bfi.ecm.Services.ServicesImpl;


import com.bfi.ecm.Entities.User;
import com.bfi.ecm.Entities.UserToken;
import com.bfi.ecm.Enums.EmailTemplateName;
import com.bfi.ecm.Repository.UserRepository;
import com.bfi.ecm.Repository.UserTokenRepository;
import com.bfi.ecm.Requests.AuthenticationRequest;
import com.bfi.ecm.Requests.RegistrationRequest;
import com.bfi.ecm.Responces.AuthenticationResponse;
import jakarta.mail.MessagingException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;


@Service
@RequiredArgsConstructor
public class AuthenticationServiceImpl implements com.bfi.ecm.Services.AuthenticationService {

    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;
    private final UserTokenRepository tokenRepository;
    private final EmailServiceImpl emailServiceImpl;
    private final AuthenticationManager authenticationManager;
    private final JwtServiceImpl jwtServiceImpl;
    private static final Logger logger = LoggerFactory.getLogger(AuthenticationServiceImpl.class);
    @Value("${mailing.activation-url}")
    private String activationUrl;
    @Value("${mailing.log-in-url}")
    private String mailingLogInUrl;

    @Override
    public void register(RegistrationRequest request) throws MessagingException, IOException {

        var user = User.builder()
                .name(request.getName())
                .lastName(request.getLastName())
                .password(passwordEncoder.encode(request.getPassword()))
                .email(request.getEmail())
                .dateOfBirth(request.getDateOfBirth())
                .accountLocked(true)
                .enabled(false)
                .role("PENDING")
                .address(request.getAddress())
                .phone(request.getPhone())
                .gender(request.getGender())
                .dateOfBirth(request.getDateOfBirth())
                .build();
        userRepository.save(user);

        sendValidationEmail(user);
    }

    private void sendValidationEmail(User user) throws MessagingException, IOException {
        var newToken = generateAndSaveActiveToken(user);
        emailServiceImpl.sendEmail(
                user.getEmail(),
                user.getFullName(),
                EmailTemplateName.ACTIVATE_ACCOUNT,
                activationUrl,
                newToken,
                "Account Activation"
        );
        sendPendingRequest(user);

    }

    public void sendPendingRequest(User user) throws MessagingException, IOException {
        String adminEmail = "khalilkrifi857@gmail.com";
        String subject = "New User Pending Approval - ECM System";

        emailServiceImpl.sendEmailAdmin(
                adminEmail,
                user.getFullName(),
                user.getEmail(),
                LocalDate.now().toString(),
                EmailTemplateName.PENDING_REQUEST,
                mailingLogInUrl,
                null,
                subject
        );
    }

    private String generateAndSaveActiveToken(User user) {
        String TokenId = generateActivationCode();
        LocalDateTime now = LocalDateTime.now();
        var token = UserToken.builder()
                .token(TokenId)
                .createdAt(now)
                .expires(now.plusMinutes(30))
                .user(user)
                .build();
        tokenRepository.save(token);
        return TokenId;
    }

    private String generateActivationCode() {
        String characters = "0123456789";
        StringBuilder activationCode = new StringBuilder(6);
        SecureRandom random = new SecureRandom();
        for (int i = 0; i < 6; i++) {
            int randINT = random.nextInt(characters.length());
            activationCode.append(characters.charAt(randINT));
        }
        return activationCode.toString();
    }

    @Override
    public String getUserRole(String email) {
        User user = null;
        if (userRepository.findByEmail(email).isPresent()) {
            user = userRepository.findByEmail(email).get();
        }
        if (user != null) {
            return user.getRole();
        }
        return null;
    }

    public boolean isAccountNonLocked(String email) {
        User user = null;
        if (userRepository.findByEmail(email).isPresent()) {
            user = userRepository.findByEmail(email).get();
        }
        if (user != null) {
            return user.isAccountLocked();
        }
        return false;
    }

    @Override
    public boolean isEnabled(String email) {
        User user = null;
        if (userRepository.findByEmail(email).isPresent()) {
            user = userRepository.findByEmail(email).get();
        }
        if (user != null) {
            return user.isEnabled();
        }
        return false;
    }

    @Override
    public AuthenticationResponse authenticate(AuthenticationRequest request) {
        try {
            var auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getEmail(),
                            request.getPassword()
                    )
            );

            String role = getUserRole(request.getEmail());
            boolean lockedStatus = isAccountNonLocked(request.getEmail());
            boolean approved = isEnabled(request.getEmail());
            if (!approved) {
                throw new DisabledException("Account not approved");
            }

            var claims = new HashMap<String, Object>();
            var user = ((User) auth.getPrincipal());
            claims.put("full name", user.getFullName());
            var jwtToken = jwtServiceImpl.generateToken(claims, user);

            return AuthenticationResponse.builder()
                    .approved(true)
                    .accountLocked(lockedStatus)
                    .token(jwtToken)
                    .role(role)
                    .build();
        } catch (AuthenticationException e) {
            // Log the error
            logger.error("Authentication failed for user: {}", request.getEmail(), e);
            throw e;
        }
    }

    @Override
    public void activateAccount(String token) throws MessagingException, IOException {
        UserToken existingTok = tokenRepository.findByToken(token).orElseThrow(() -> new IllegalStateException("Token not found"));
        if (LocalDateTime.now().isAfter(existingTok.getExpires())) {
            sendValidationEmail(existingTok.getUser());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Activation Token has already expired");
        }
        var user = userRepository.findById(existingTok.getUser().getId())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        user.setAccountLocked(false);
        userRepository.save(user);
        existingTok.setValidatedAt(LocalDateTime.now());
        tokenRepository.save(existingTok);
    }
}
