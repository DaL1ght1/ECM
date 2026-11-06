package com.bfi.ecm.Services.ServicesImpl;

import com.bfi.ecm.Configurations.security.InvalidRefreshTokenException;
import com.bfi.ecm.Configurations.security.JwtProperties;
import com.bfi.ecm.Entities.RefreshToken;
import com.bfi.ecm.Entities.User;
import com.bfi.ecm.Repository.RefreshTokenRepository;
import com.bfi.ecm.Services.RefreshTokenService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RefreshTokenServiceImpl implements RefreshTokenService {

    private static final Logger log = LoggerFactory.getLogger(RefreshTokenServiceImpl.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtProperties jwtProperties;

    @Override
    @Transactional
    public String issue(User user) {
        return create(user, UUID.randomUUID().toString());
    }

    @Override
    @Transactional(noRollbackFor = InvalidRefreshTokenException.class)
    public RotatedToken rotate(String rawToken) {
        RefreshToken current = refreshTokenRepository.findByTokenHash(hash(rawToken))
                .orElseThrow(() -> new InvalidRefreshTokenException("Unknown refresh token"));
        Instant now = Instant.now();

        if (current.getRevokedAt() != null) {
            // An already-rotated token was presented again: assume it was stolen and end the whole session.
            log.warn("Refresh token reuse detected for user {}", current.getUser().getUuid());
            refreshTokenRepository.revokeFamily(current.getFamilyId(), now);
            throw new InvalidRefreshTokenException("Refresh token reuse detected");
        }
        if (current.getExpiresAt().isBefore(now)) {
            throw new InvalidRefreshTokenException("Refresh token expired");
        }

        User user = current.getUser();
        if (!user.isEnabled() || !user.isAccountNonLocked()) {
            refreshTokenRepository.revokeFamily(current.getFamilyId(), now);
            throw new InvalidRefreshTokenException("Account is disabled or locked");
        }

        current.setRevokedAt(now);
        return new RotatedToken(user, create(user, current.getFamilyId()));
    }

    @Override
    @Transactional
    public void revoke(String rawToken) {
        refreshTokenRepository.findByTokenHash(hash(rawToken))
                .ifPresent(token -> refreshTokenRepository.revokeFamily(token.getFamilyId(), Instant.now()));
    }

    @Override
    @Transactional
    public void revokeAll(User user) {
        refreshTokenRepository.revokeAllForUser(user, Instant.now());
    }

    @Override
    @Transactional
    public void deleteAll(User user) {
        refreshTokenRepository.deleteByUser(user);
    }

    private String create(User user, String familyId) {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        RefreshToken token = new RefreshToken();
        token.setTokenHash(hash(rawToken));
        token.setFamilyId(familyId);
        token.setUser(user);
        token.setExpiresAt(Instant.now().plus(jwtProperties.refreshTokenTtl()));
        refreshTokenRepository.save(token);
        return rawToken;
    }

    private static String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
