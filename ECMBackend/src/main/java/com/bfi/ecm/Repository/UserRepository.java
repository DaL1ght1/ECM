package com.bfi.ecm.Repository;

import com.bfi.ecm.Entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    List<User> findByEnabled(boolean locked);

    boolean existsByEmail(String email);

}
