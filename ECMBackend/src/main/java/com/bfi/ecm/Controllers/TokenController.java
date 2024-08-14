package com.bfi.ecm.Controllers;

import com.bfi.ecm.Entities.Tokens;
import com.bfi.ecm.Services.ServicesImpl.TextIndexationServiceImpl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/bfi/v1/tokens")
public class TokenController {
    private final TextIndexationServiceImpl tokenService;

    public TokenController(TextIndexationServiceImpl tokenService) {
        this.tokenService = tokenService;
    }

    @PostMapping("/save")
    public ResponseEntity<Void> saveToken(@RequestParam String text) {
        tokenService.saveToken(text);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/search")
    public ResponseEntity<List<Tokens>> searchBySoundex(@RequestParam String soundexCode) {
        List<Tokens> tokens = tokenService.findBySoundexCode(soundexCode);
        return ResponseEntity.ok(tokens);
    }
}