package com.bfi.ecm.Controllers;

import com.bfi.ecm.Entities.User;
import com.bfi.ecm.Services.ServicesImpl.UserServicesImpl;
import jakarta.mail.MessagingException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/bfi/v1/admin")
public class AdminController {

    private final UserServicesImpl userService;

    @Autowired
    public AdminController(UserServicesImpl userService) {
        this.userService = userService;
    }

    @GetMapping("/pending-users")
    public List<User> getPendingUsers() {
        return userService.findPendingUsers();
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
    public List<User> getAllUsers() {
        return userService.findAllUsers();
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

