package com.bfi.ecm.Controllers;

import com.bfi.ecm.Entities.User;
import com.bfi.ecm.Services.ServicesImpl.UserServicesImpl;
import jakarta.mail.MessagingException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/bfi/v1/user")

public class UserController {
    private final UserServicesImpl userService;

    @Autowired
    public UserController(UserServicesImpl userService) {
        this.userService = userService;
    }


    @GetMapping()
    public List<User> findAllUsers() {
        return userService.findAllUsers();
    }

    @GetMapping("/email-exists")
    public ResponseEntity<Boolean> checkEmailExists(@RequestParam String email) {
        boolean exists = userService.emailExists(email);
        return ResponseEntity.ok(exists);
    }

    @PostMapping("/save")
    public ResponseEntity<User> saveUser(@RequestBody User user) throws MessagingException, IOException {
        if (userService.emailExists(user.getEmail())) {
            return ResponseEntity.badRequest().body(user);
        }
        user.setAccountLocked(true);
        userService.save(user);
        return ResponseEntity.ok(user);
    }

    @GetMapping("/{id}")
    public User findUserById(@PathVariable("id") Long id) {
        return userService.findUserByID(id);
    }

    @PutMapping("/UpdateUser")
    public void updateUser(@RequestBody User user) {
        userService.updateUser(user);
    }


    @DeleteMapping("/{id}")
    public void deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
    }

    @PutMapping("/approve/{id}")
    public void approveUser(@PathVariable Long id, @RequestBody boolean approved) {
        User user = userService.findUserByID(id);
        if (user != null) {
            user.setAccountLocked(!approved);
            userService.updateUser(user);

        }
    }

    @GetMapping("/pending")
    public List<User> getPendingUsers() {
        return userService.findPendingUsers();
    }


}
