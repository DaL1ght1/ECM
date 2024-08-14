package com.bfi.ecm.Services;

import com.bfi.ecm.Entities.User;
import jakarta.mail.MessagingException;

import java.io.IOException;
import java.util.List;


public interface UserServices {
    List<User> findAllUsers();

    void save(User p) throws MessagingException, IOException;

    void updateUser(User p);

    void deleteUser(Long id);

    User findUserByID(Long ID);


}
