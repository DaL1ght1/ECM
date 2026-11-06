package com.bfi.ecm.security;

import com.bfi.ecm.Configurations.security.JsonSecurityErrorHandler;
import com.bfi.ecm.Configurations.security.JwtConfig;
import com.bfi.ecm.Configurations.security.JwtProperties;
import com.bfi.ecm.Configurations.security.SecurityConfigAdvanced;
import com.bfi.ecm.Controllers.AdminController;
import com.bfi.ecm.Entities.User;
import com.bfi.ecm.Services.ServicesImpl.JwtServiceImpl;
import com.bfi.ecm.Services.ServicesImpl.UserServicesImpl;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminController.class)
@Import({SecurityConfigAdvanced.class, JwtConfig.class, JsonSecurityErrorHandler.class, JwtServiceImpl.class})
@TestPropertySource(properties = "jwt.secret=" + AdminEndpointSecurityTest.SECRET)
class AdminEndpointSecurityTest {

    // Base64 of "0123456789abcdef0123456789abcdef" (32 bytes)
    static final String SECRET = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=";
    private static final String ALL_USERS = "/bfi/v1/admin/all-users";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtServiceImpl jwtService;

    @MockBean
    private UserServicesImpl userService;

    @Test
    void rejectsRequestWithoutToken() throws Exception {
        mockMvc.perform(get(ALL_USERS))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string(HttpHeaders.WWW_AUTHENTICATE, "Bearer"))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
    }

    @Test
    void rejectsMalformedTokenWith401NotServerError() throws Exception {
        mockMvc.perform(get(ALL_USERS).header(HttpHeaders.AUTHORIZATION, "Bearer not-a-jwt"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsTokenSignedWithAnotherKey() throws Exception {
        var otherKey = new SecretKeySpec("ffffffffffffffffffffffffffffffff".getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        var forger = new JwtServiceImpl(new NimbusJwtEncoder(new ImmutableSecret<>(otherKey)),
                new JwtProperties("unused", Duration.ofMinutes(15), Duration.ofDays(7), true));

        mockMvc.perform(get(ALL_USERS).header(HttpHeaders.AUTHORIZATION, "Bearer " + forger.generateAccessToken(user("ADMIN"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void forbidsNonAdmin() throws Exception {
        mockMvc.perform(get(ALL_USERS).header(HttpHeaders.AUTHORIZATION, bearer("USER")))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
    }

    @Test
    void allowsAdminAndNeverExposesPasswordHash() throws Exception {
        given(userService.findAllUsers()).willReturn(List.of(user("USER")));

        mockMvc.perform(get(ALL_USERS).header(HttpHeaders.AUTHORIZATION, bearer("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].email").value("user@ecm.test"))
                .andExpect(jsonPath("$[0].password").doesNotExist());
    }

    private String bearer(String role) {
        return "Bearer " + jwtService.generateAccessToken(user(role));
    }

    private static User user(String role) {
        User user = User.builder()
                .email("user@ecm.test")
                .password("$2a$10$hash")
                .role(role)
                .enabled(true)
                .build();
        user.setUuid(UUID.randomUUID().toString());
        return user;
    }
}
