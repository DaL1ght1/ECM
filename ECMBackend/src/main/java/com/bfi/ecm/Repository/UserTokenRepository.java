package com.bfi.ecm.Repository;

import com.bfi.ecm.Entities.User;
import com.bfi.ecm.Entities.UserToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserTokenRepository extends JpaRepository<UserToken, Long> {
    Optional<UserToken> findByToken(String token);

    void deleteByUser(User user);
}
