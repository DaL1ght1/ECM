package com.bfi.ecm.Services.ServicesImpl;

import com.bfi.ecm.Entities.User;
import com.bfi.ecm.Enums.EmailTemplateName;
import com.bfi.ecm.Repository.TokensRepository;
import com.bfi.ecm.Repository.UserRepository;
import com.bfi.ecm.Repository.UserTokenRepository;
import com.bfi.ecm.Services.UserServices;
import jakarta.mail.MessagingException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserServicesImpl implements UserServices {


    private final UserRepository userRepository;
    private final EmailServiceImpl emailServiceImpl;
    private final PasswordEncoder passwordEncoder;
    private final UserTokenRepository userTokenRepository;
    private final TokensRepository tokensRepository;


    @Override
    public List<User> findAllUsers() {

        return userRepository.findAll();
    }

    public boolean emailExists(String email) {
        return userRepository.existsByEmail(email);
    }

    @Override
    public void save(User p) throws MessagingException, IOException {
        if (emailExists(p.getEmail())) {
            throw new RuntimeException("Email already exists");
        }
        p.setPassword(passwordEncoder.encode(p.getPassword()));
        userRepository.save(p);

    }

    @Override
    public void updateUser(User p) {
        userRepository.findById(p.getId()).ifPresent(p1 -> userRepository.save(p));

    }

    @Override
    public User findUserByID(Long ID) {
        return userRepository.findById(ID).orElse(null);
    }

    public List<User> findPendingUsers() {
        return userRepository.findByEnabled(false);
    }

    public void approveUser(Long id, String role) throws MessagingException {
        User User = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        User.setAccountLocked(false);
        User.setRole(role);
        User.setEnabled(true);
        userRepository.save(User);

        String TargetEmail = User.getEmail();
        String subject = "Welcome to the ECM Family!";
        emailServiceImpl.sendEmail(
                TargetEmail,
                User.getFullName(),
                EmailTemplateName.WELCOME_EMAIL,
                null,
                null,
                subject
        );
    }

    @Transactional
    public void declineUser(Long id) throws MessagingException {
        User User = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        userTokenRepository.deleteByUser(User);
        userRepository.deleteById(id);

        String targetEmail = User.getEmail();
        String subject = "ECM Application Status";
        emailServiceImpl.sendEmail(
                targetEmail,
                User.getFullName(),
                EmailTemplateName.REJECTED_EMAIL,
                null,
                null,
                subject
        );
    }

    public void updateUserRole(Long id, String role) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        user.setRole(role);  // Assuming the `User` entity has a `setRole` method
        userRepository.save(user);
    }


    public boolean UserBanStatus(Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        user.setAccountLocked(!user.isAccountLocked());
        userRepository.save(user);
        return user.isAccountLocked();
    }

    @Transactional
    @Override
    public void deleteUser(Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        userTokenRepository.deleteByUser(user);
        userRepository.deleteById(id);

    }

}
