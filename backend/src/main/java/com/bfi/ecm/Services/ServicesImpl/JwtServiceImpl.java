package com.bfi.ecm.Services.ServicesImpl;

import com.bfi.ecm.Configurations.security.JwtConfig;
import com.bfi.ecm.Configurations.security.JwtProperties;
import com.bfi.ecm.Entities.User;
import com.bfi.ecm.Services.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class JwtServiceImpl implements JwtService {

    private final JwtEncoder jwtEncoder;
    private final JwtProperties jwtProperties;

    @Override
    public String generateAccessToken(User user) {
        Instant now = Instant.now();
        List<String> roles = user.getRole() == null ? List.of() : List.of(user.getRole());
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(JwtConfig.ISSUER)
                .issuedAt(now)
                .expiresAt(now.plus(jwtProperties.accessTokenTtl()))
                .subject(user.getUuid())
                .claim("email", user.getEmail())
                .claim("name", user.getFullName())
                .claim(JwtConfig.ROLES_CLAIM, roles)
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }

    @Override
    public long accessTokenTtlSeconds() {
        return jwtProperties.accessTokenTtl().toSeconds();
    }
}
