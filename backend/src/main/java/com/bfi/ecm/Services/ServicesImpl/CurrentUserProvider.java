package com.bfi.ecm.Services.ServicesImpl;

import com.bfi.ecm.Entities.User;
import com.bfi.ecm.Repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class CurrentUserProvider {

    private final UserRepository userRepository;

    public User get() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        return userRepository.findByUuid(jwt.getSubject())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unknown user"));
    }
}
