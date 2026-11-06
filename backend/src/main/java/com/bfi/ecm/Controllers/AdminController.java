package com.bfi.ecm.Controllers;

import com.bfi.ecm.Mappers.UserDto;
import com.bfi.ecm.Services.ServicesImpl.SearchIndexer;
import com.bfi.ecm.Services.ServicesImpl.UserServicesImpl;
import jakarta.mail.MessagingException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final UserServicesImpl userService;
    private final SearchIndexer searchIndexer;

    @Autowired
    public AdminController(UserServicesImpl userService, SearchIndexer searchIndexer) {
        this.userService = userService;
        this.searchIndexer = searchIndexer;
    }

    @PostMapping("/search/reindex")
    public ResponseEntity<Void> rebuildSearchIndex() {
        searchIndexer.rebuild();
        return ResponseEntity.accepted().build();
    }

    @GetMapping("/pending-users")
    public List<UserDto> getPendingUsers() {
        return userService.findPendingUsers().stream().map(UserDto::fromEntity).toList();
    }

    @PutMapping("/approve/{id}")
    public ResponseEntity<Void> approveUser(@PathVariable Long id, @RequestParam String role) throws MessagingException {
        userService.approveUser(id, role);
        return ResponseEntity.noContent().build();
    }


    @DeleteMapping("/{id}")
    public void declineUser(@PathVariable("id") Long id) throws MessagingException {
        userService.declineUser(id);
    }

    @GetMapping("/all-users")
    public List<UserDto> getAllUsers() {
        return userService.findAllUsers().stream().map(UserDto::fromEntity).toList();
    }

    @PutMapping("/update-role/{id}")
    public ResponseEntity<Void> updateUserRole(@PathVariable Long id, @RequestParam String role) {
        userService.updateUserRole(id, role);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/ban-user/{id}")
    public ResponseEntity<Boolean> UserBanStatus(@PathVariable Long id) {
        return ResponseEntity.ok(userService.UserBanStatus(id));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<String> deleteUser(@PathVariable Long id) {
        try {
            userService.deleteUser(id);
            return ResponseEntity.ok("User deleted successfully");
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

}

