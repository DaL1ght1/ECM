package com.bfi.ecm.Requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateFolderRequest(@NotBlank @Size(max = 255) String name, String parentId) {
}
