package com.bfi.ecm.Entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;


@Setter
@Getter
@AllArgsConstructor
@NoArgsConstructor
@Entity
public class File extends BaseEntity {

    private String name;
    private Long size;
    private String fileType;
    private String path;


    @ManyToOne
    @JoinColumn(name = "directory_id")
    private Directory directory;

    @ManyToMany(cascade = {CascadeType.MERGE, CascadeType.PERSIST, CascadeType.REFRESH}, fetch = FetchType.LAZY)
    @JoinTable(name = "File_tokens",
            joinColumns = @JoinColumn(name = "file_id"),
            inverseJoinColumns = @JoinColumn(name = "tokens_id"))
    private Set<Tokens> tokens = new HashSet<>();

}
