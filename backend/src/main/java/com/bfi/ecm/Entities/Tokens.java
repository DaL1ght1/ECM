package com.bfi.ecm.Entities;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.ManyToMany;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;

@Entity
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor

public class Tokens extends BaseEntity {
    private String text;
    private String soundexCode;
    private String NoVowel;

    @ManyToMany(mappedBy = "tokens", cascade = CascadeType.MERGE)
    private Set<File> files = new HashSet<>();

}
