package com.bfi.ecm.Entities;

import com.bfi.ecm.Enums.AccessLevel;
import com.bfi.ecm.Enums.PrincipalType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "folder_permission",
        uniqueConstraints = @UniqueConstraint(columnNames = {"folder_id", "principal_type", "principal"}))
public class FolderPermission extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "folder_id", nullable = false)
    private Folder folder;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private PrincipalType principalType;

    @Column(nullable = false)
    private String principal;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private AccessLevel access;

    public boolean appliesTo(User user) {
        return switch (principalType) {
            case USER -> principal.equals(user.getUuid());
            case ROLE -> principal.equals(user.getRole());
        };
    }
}
