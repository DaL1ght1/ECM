package com.bfi.ecm.Requests;

import com.bfi.ecm.Mappers.PermissionDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record UpdatePermissionsRequest(@NotNull List<@Valid PermissionDto> permissions) {
}
