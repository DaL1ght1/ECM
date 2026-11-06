package com.bfi.ecm.Repository;

import com.bfi.ecm.Entities.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    Optional<User> findByUuid(String uuid);

    @Query("""
            SELECT u FROM User u
            WHERE u.enabled = true AND u.accountLocked = false AND u.uuid <> :excludeUuid
              AND (LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%'))
                OR LOWER(CONCAT(COALESCE(u.name, ''), ' ', COALESCE(u.lastName, ''))) LIKE LOWER(CONCAT('%', :query, '%')))
            ORDER BY u.email
            """)
    List<User> searchDirectory(@Param("query") String query, @Param("excludeUuid") String excludeUuid, Pageable pageable);

    List<User> findByEnabled(boolean locked);

    boolean existsByEmail(String email);

}
