package com.bfi.ecm.Controllers;

import com.bfi.ecm.Mappers.UserDto;
import com.bfi.ecm.Mappers.UserSummary;
import com.bfi.ecm.Repository.UserRepository;
import com.bfi.ecm.Services.ServicesImpl.UserServicesImpl;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@Validated
@RequestMapping("/api/v1/user")
@RequiredArgsConstructor
public class UserController {
    private final UserServicesImpl userService;
    private final UserRepository userRepository;

    @GetMapping("/directory")
    public List<UserSummary> directory(@AuthenticationPrincipal Jwt jwt,
                                       @RequestParam @NotBlank @Size(min = 2, max = 100) String q) {
        return userRepository.searchDirectory(q.trim(), jwt.getSubject(), PageRequest.of(0, 20)).stream()
                .map(UserSummary::fromEntity)
                .toList();
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> me(@AuthenticationPrincipal Jwt jwt) {
        return userService.findByUuid(jwt.getSubject())
                .map(UserDto::fromEntity)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
