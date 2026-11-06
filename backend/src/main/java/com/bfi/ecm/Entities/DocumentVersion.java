package com.bfi.ecm.Entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "document_version",
        uniqueConstraints = @UniqueConstraint(columnNames = {"document_id", "version_number"}))
public class DocumentVersion extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "document_id", nullable = false)
    private Document document;

    @Column(nullable = false)
    private int versionNumber;

    @Column(nullable = false, length = 36)
    private String blobKey;

    @Column(nullable = false, length = 64)
    private String sha256;

    @Column(nullable = false)
    private long size;

    @Column(nullable = false)
    private String mimeType;

    @Column(length = 500)
    private String comment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by_id", nullable = false)
    private User createdBy;
}
