package com.bfi.ecm.Services;

import com.bfi.ecm.Entities.User;

public interface RefreshTokenService {

    String issue(User user);

    RotatedToken rotate(String rawToken);

    void revoke(String rawToken);

    void revokeAll(User user);

    void deleteAll(User user);

    record RotatedToken(User user, String rawToken) {
    }
}
