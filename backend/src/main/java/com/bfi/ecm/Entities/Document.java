package com.bfi.ecm.Entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "document")
public class Document extends BaseEntity {

    @Column(nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "folder_id")
    private Folder folder;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "current_version_id")
    private DocumentVersion currentVersion;

    @Version
    @Column(name = "lock_version", nullable = false)
    private long lockVersion;

    private Instant deletedAt;

    public boolean isDeleted() {
        return deletedAt != null;
    }
}
