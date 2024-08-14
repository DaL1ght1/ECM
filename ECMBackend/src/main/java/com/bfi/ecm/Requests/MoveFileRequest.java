package com.bfi.ecm.Requests;


import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@RequiredArgsConstructor
public class MoveFileRequest {
    private Long newParentFileId;
    
}