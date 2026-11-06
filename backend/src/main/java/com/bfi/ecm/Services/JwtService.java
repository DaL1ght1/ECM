package com.bfi.ecm.Services;

import com.bfi.ecm.Entities.User;

public interface JwtService {
    String generateAccessToken(User user);

    long accessTokenTtlSeconds();
}
