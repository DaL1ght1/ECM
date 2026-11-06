package com.bfi.ecm.Services;

import com.bfi.ecm.Entities.User;

import java.util.List;
import java.util.Optional;


public interface UserServices {
    List<User> findAllUsers();

    void deleteUser(Long id);

    User findUserByID(Long ID);

    Optional<User> findByUuid(String uuid);


}
