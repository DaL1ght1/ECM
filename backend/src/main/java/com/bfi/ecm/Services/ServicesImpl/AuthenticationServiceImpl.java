package com.bfi.ecm.Services.ServicesImpl;


import com.bfi.ecm.Configurations.AdminProperties;
import com.bfi.ecm.Entities.User;
import com.bfi.ecm.Entities.UserToken;
import com.bfi.ecm.Enums.EmailTemplateName;
import com.bfi.ecm.Repository.UserRepository;
import com.bfi.ecm.Repository.UserTokenRepository;
import com.bfi.ecm.Requests.AuthenticationRequest;
import com.bfi.ecm.Requests.RegistrationRequest;
import com.bfi.ecm.Responces.AuthenticationResponse;
import com.bfi.ecm.Services.JwtService;
import com.bfi.ecm.Services.RefreshTokenService;
import jakarta.mail.MessagingException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
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


@Service
@RequiredArgsConstructor
public class AuthenticationServiceImpl implements com.bfi.ecm.Services.AuthenticationService {

    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;
    private final UserTokenRepository tokenRepository;
    private final EmailServiceImpl emailServiceImpl;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final AdminProperties adminProperties;
    private static final Logger logger = LoggerFactory.getLogger(AuthenticationServiceImpl.class);
    @Value("${mailing.activation-url}")
    private String activationUrl;
    @Value("${mailing.log-in-url}")
    private String mailingLogInUrl;

    @Override
    public void register(RegistrationRequest request) throws MessagingException, IOException {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists");
        }

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
        String adminEmail = adminProperties.notificationEmail();
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
    public AuthSession authenticate(AuthenticationRequest request) {
        try {
            // DaoAuthenticationProvider rejects locked (LockedException) and unapproved (DisabledException) accounts.
            var auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getEmail(),
                            request.getPassword()
                    )
            );
            var user = (User) auth.getPrincipal();
            return createSession(user, refreshTokenService.issue(user));
        } catch (AuthenticationException e) {
            logger.warn("Authentication failed for user: {} ({})", request.getEmail(), e.getClass().getSimpleName());
            throw e;
        }
    }

    @Override
    public AuthSession refresh(String refreshToken) {
        var rotated = refreshTokenService.rotate(refreshToken);
        return createSession(rotated.user(), rotated.rawToken());
    }

    @Override
    public void logout(String refreshToken) {
        if (refreshToken != null) {
            refreshTokenService.revoke(refreshToken);
        }
    }

    private AuthSession createSession(User user, String refreshToken) {
        var body = AuthenticationResponse.builder()
                .token(jwtService.generateAccessToken(user))
                .expiresIn(jwtService.accessTokenTtlSeconds())
                .approved(user.isEnabled())
                .accountLocked(!user.isAccountNonLocked())
                .role(user.getRole())
                .build();
        return new AuthSession(body, refreshToken);
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
