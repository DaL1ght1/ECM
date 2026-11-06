package com.bfi.ecm.security;

import com.bfi.ecm.Configurations.security.InvalidRefreshTokenException;
import com.bfi.ecm.Configurations.security.JsonSecurityErrorHandler;
import com.bfi.ecm.Configurations.security.JwtConfig;
import com.bfi.ecm.Configurations.security.SecurityConfigAdvanced;
import com.bfi.ecm.Controllers.AuthenticationController;
import com.bfi.ecm.Responces.AuthenticationResponse;
import com.bfi.ecm.Services.AuthenticationService;
import com.bfi.ecm.Services.AuthenticationService.AuthSession;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthenticationController.class)
@Import({SecurityConfigAdvanced.class, JwtConfig.class, JsonSecurityErrorHandler.class})
@TestPropertySource(properties = "jwt.secret=" + AdminEndpointSecurityTest.SECRET)
class AuthenticationControllerTest {

    private static final AuthSession SESSION = new AuthSession(
            AuthenticationResponse.builder().token("access-token").expiresIn(900).role("USER").approved(true).build(),
            "new-refresh-token");

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuthenticationService authService;

    @Test
    void loginReturnsAccessTokenAndSetsHttpOnlyRefreshCookie() throws Exception {
        given(authService.authenticate(any())).willReturn(SESSION);

        mockMvc.perform(post("/api/v1/auth/authenticate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"user@ecm.test\",\"password\":\"password123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("access-token"))
                .andExpect(jsonPath("$.expiresIn").value(900))
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, allOf(
                        containsString("refresh_token=new-refresh-token"),
                        containsString("HttpOnly"),
                        containsString("Secure"),
                        containsString("SameSite=Strict"),
                        containsString("Path=/api/v1/auth"))));
    }

    @Test
    void refreshWithoutCookieIsUnauthorized() throws Exception {
        mockMvc.perform(post("/api/v1/auth/refresh"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void refreshRotatesCookie() throws Exception {
        given(authService.refresh("old-refresh-token")).willReturn(SESSION);

        mockMvc.perform(post("/api/v1/auth/refresh").cookie(new Cookie("refresh_token", "old-refresh-token")))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("refresh_token=new-refresh-token")));
    }

    @Test
    void rejectedRefreshClearsCookie() throws Exception {
        given(authService.refresh("stolen")).willThrow(new InvalidRefreshTokenException("Refresh token reuse detected"));

        mockMvc.perform(post("/api/v1/auth/refresh").cookie(new Cookie("refresh_token", "stolen")))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=0")));
    }

    @Test
    void logoutRevokesAndClearsCookie() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout").cookie(new Cookie("refresh_token", "current")))
                .andExpect(status().isNoContent())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Max-Age=0")));

        then(authService).should().logout("current");
    }
}
