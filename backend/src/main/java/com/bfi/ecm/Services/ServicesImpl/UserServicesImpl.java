package com.bfi.ecm.Services.ServicesImpl;

import com.bfi.ecm.Entities.User;
import com.bfi.ecm.Enums.EmailTemplateName;
import com.bfi.ecm.Repository.UserRepository;
import com.bfi.ecm.Repository.UserTokenRepository;
import com.bfi.ecm.Services.RefreshTokenService;
import com.bfi.ecm.Services.UserServices;
import com.bfi.ecm.Tools.Roles;
import jakarta.mail.MessagingException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserServicesImpl implements UserServices {


    private final UserRepository userRepository;
    private final EmailServiceImpl emailServiceImpl;
    private final UserTokenRepository userTokenRepository;
    private final RefreshTokenService refreshTokenService;


    @Override
    public List<User> findAllUsers() {

        return userRepository.findAll();
    }

    @Override
    public User findUserByID(Long ID) {
        return userRepository.findById(ID).orElse(null);
    }

    @Override
    public Optional<User> findByUuid(String uuid) {
        return userRepository.findByUuid(uuid);
    }

    public List<User> findPendingUsers() {
        return userRepository.findByEnabled(false);
    }

    public void approveUser(Long id, String role) throws MessagingException {
        User User = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        User.setAccountLocked(false);
        User.setRole(requireAssignableRole(role));
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
        refreshTokenService.deleteAll(User);
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
        user.setRole(requireAssignableRole(role));
        userRepository.save(user);
    }


    public boolean UserBanStatus(Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        user.setAccountLocked(!user.isAccountLocked());
        userRepository.save(user);
        if (user.isAccountLocked()) {
            refreshTokenService.revokeAll(user);
        }
        return user.isAccountLocked();
    }

    @Transactional
    @Override
    public void deleteUser(Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        userTokenRepository.deleteByUser(user);
        refreshTokenService.deleteAll(user);
        userRepository.deleteById(id);

    }

    private static String requireAssignableRole(String role) {
        if (role == null || !Roles.ASSIGNABLE.contains(role)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown role: " + role);
        }
        return role;
    }

}
