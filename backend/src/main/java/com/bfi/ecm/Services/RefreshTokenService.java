package com.bfi.ecm.Services;

import com.bfi.ecm.Entities.User;

public interface RefreshTokenService {

    /** Starts a new session family and returns the raw token (sent to the client, never stored). */
    String issue(User user);

    /** Consumes a raw token and returns its replacement. Throws InvalidRefreshTokenException. */
    RotatedToken rotate(String rawToken);

    void revoke(String rawToken);

    void revokeAll(User user);

    void deleteAll(User user);

    record RotatedToken(User user, String rawToken) {
    }
}
