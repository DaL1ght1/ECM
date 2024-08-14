package com.bfi.ecm.Entities;


import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Entity

public class UserToken {
    @Id
    @GeneratedValue
    private long id;
    private String token;
    private LocalDateTime expires;
    private LocalDateTime createdAt;
    private LocalDateTime validatedAt;

    @ManyToOne(cascade = CascadeType.ALL)
    @JoinColumn(name = "userID", nullable = false)
    private User user;
}
