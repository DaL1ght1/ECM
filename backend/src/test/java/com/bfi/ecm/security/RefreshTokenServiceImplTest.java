package com.bfi.ecm.security;

import com.bfi.ecm.Configurations.security.InvalidRefreshTokenException;
import com.bfi.ecm.Configurations.security.JwtProperties;
import com.bfi.ecm.Entities.RefreshToken;
import com.bfi.ecm.Entities.User;
import com.bfi.ecm.Repository.RefreshTokenRepository;
import com.bfi.ecm.Services.RefreshTokenService.RotatedToken;
import com.bfi.ecm.Services.ServicesImpl.RefreshTokenServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceImplTest {

    @Mock
    private RefreshTokenRepository repository;

    private RefreshTokenServiceImpl service;
    private User user;

    @BeforeEach
    void setUp() {
        service = new RefreshTokenServiceImpl(repository,
                new JwtProperties("unused", Duration.ofMinutes(15), Duration.ofDays(7), true));
        user = User.builder().email("user@ecm.test").role("USER").enabled(true).build();
    }

    @Test
    void issueStoresOnlyTheHash() {
        String raw = service.issue(user);

        ArgumentCaptor<RefreshToken> saved = ArgumentCaptor.forClass(RefreshToken.class);
        then(repository).should().save(saved.capture());
        assertThat(raw).isNotBlank();
        assertThat(saved.getValue().getTokenHash()).hasSize(64).isNotEqualTo(raw);
        assertThat(saved.getValue().getExpiresAt()).isAfter(Instant.now().plus(Duration.ofDays(6)));
    }

    @Test
    void rotateRevokesCurrentAndIssuesReplacementInSameFamily() {
        RefreshToken current = token(Instant.now().plus(Duration.ofDays(1)));
        given(repository.findByTokenHash(anyString())).willReturn(Optional.of(current));

        RotatedToken rotated = service.rotate("raw");

        ArgumentCaptor<RefreshToken> saved = ArgumentCaptor.forClass(RefreshToken.class);
        then(repository).should().save(saved.capture());
        assertThat(current.getRevokedAt()).isNotNull();
        assertThat(saved.getValue().getFamilyId()).isEqualTo("family-1");
        assertThat(saved.getValue().getTokenHash()).isNotEqualTo(current.getTokenHash());
        assertThat(rotated.user()).isSameAs(user);
        assertThat(rotated.rawToken()).isNotBlank().isNotEqualTo("raw");
    }

    @Test
    void reusingRotatedTokenRevokesWholeFamily() {
        RefreshToken current = token(Instant.now().plus(Duration.ofDays(1)));
        current.setRevokedAt(Instant.now().minusSeconds(5));
        given(repository.findByTokenHash(anyString())).willReturn(Optional.of(current));

        assertThatThrownBy(() -> service.rotate("raw"))
                .isInstanceOf(InvalidRefreshTokenException.class)
                .hasMessageContaining("reuse");
        then(repository).should().revokeFamily(eq("family-1"), any());
        then(repository).should(never()).save(any());
    }

    @Test
    void expiredTokenIsRejected() {
        given(repository.findByTokenHash(anyString())).willReturn(Optional.of(token(Instant.now().minusSeconds(1))));

        assertThatThrownBy(() -> service.rotate("raw")).isInstanceOf(InvalidRefreshTokenException.class);
        then(repository).should(never()).save(any());
    }

    @Test
    void lockedUserCannotRefresh() {
        user.setAccountLocked(true);
        given(repository.findByTokenHash(anyString())).willReturn(Optional.of(token(Instant.now().plus(Duration.ofDays(1)))));

        assertThatThrownBy(() -> service.rotate("raw")).isInstanceOf(InvalidRefreshTokenException.class);
        then(repository).should().revokeFamily(eq("family-1"), any());
    }

    @Test
    void unknownTokenIsRejected() {
        given(repository.findByTokenHash(anyString())).willReturn(Optional.empty());

        assertThatThrownBy(() -> service.rotate("raw")).isInstanceOf(InvalidRefreshTokenException.class);
    }

    private RefreshToken token(Instant expiresAt) {
        RefreshToken token = new RefreshToken();
        token.setTokenHash("a".repeat(64));
        token.setFamilyId("family-1");
        token.setUser(user);
        token.setExpiresAt(expiresAt);
        return token;
    }
}
