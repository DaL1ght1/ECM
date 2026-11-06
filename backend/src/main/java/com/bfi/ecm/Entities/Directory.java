package com.bfi.ecm.Entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Entity
public class Directory extends BaseEntity {
    private String name;

    @OneToMany(mappedBy = "directory", orphanRemoval = true)
    private List<File> files = new ArrayList<>();

    private String path;

    @ManyToOne
    @JoinColumn(name = "parent_id")
    private Directory parent;

    @OneToMany(mappedBy = "parent", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Directory> children = new ArrayList<>();
}

