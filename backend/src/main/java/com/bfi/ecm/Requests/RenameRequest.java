package com.bfi.ecm.Requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RenameRequest(@NotBlank @Size(max = 255) String name) {
}
