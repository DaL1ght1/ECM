package com.bfi.ecm.Controllers;

import com.bfi.ecm.Mappers.UserDto;
import com.bfi.ecm.Services.ServicesImpl.UserServicesImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints for the signed-in user. User management (list, approve, ban, delete) lives in {@link AdminController}.
 */
@RestController
@RequestMapping("/bfi/v1/user")
@RequiredArgsConstructor
public class UserController {
    private final UserServicesImpl userService;

    @GetMapping("/me")
    public ResponseEntity<UserDto> me(@AuthenticationPrincipal Jwt jwt) {
        return userService.findByUuid(jwt.getSubject())
                .map(UserDto::fromEntity)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
