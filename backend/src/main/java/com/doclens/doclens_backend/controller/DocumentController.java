package com.doclens.doclens_backend.controller;
import com.doclens.doclens_backend.dto.ApiResponse;
import com.doclens.doclens_backend.dto.DocumentMetadataDto;
import com.doclens.doclens_backend.dto.DocumentResponseDto;
import com.doclens.doclens_backend.service.DocumentMetaDataService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/documents")
@RequiredArgsConstructor
@Slf4j
public class DocumentController {

    private final DocumentMetaDataService documentMetaDataService;


    @PostMapping(path = "/upload",consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<DocumentResponseDto>> uploadDocument(@RequestParam("file")MultipartFile file){

        log.info("document uploading started:");

        DocumentResponseDto documentResponseDto = documentMetaDataService.uploadAndProcess(file);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.<DocumentResponseDto>builder()
                        .success(true)
                        .data(documentResponseDto)
                        .timestamp(LocalDateTime.now())
                        .message("Document uploaded successfully ")
                        .build());
    }

    @PostMapping(value = "/upload-multiple", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<List<DocumentResponseDto>>> uploadMultiple(
            @RequestParam("files") List<MultipartFile> files) {

        List<DocumentResponseDto> responseDtos = documentMetaDataService.uploadMultipleDocuments(files);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(
                        ApiResponse.<List<DocumentResponseDto>>
                                        builder()
                                .message("Document uploaded successfully")
                                .success(true)
                                .timestamp(LocalDateTime.now())
                                .data(responseDtos)
                                .build()
                );
    }

    // list all uploaded documents
    @GetMapping
    public ResponseEntity<ApiResponse<List<DocumentMetadataDto>>> getAllDocuments(){
        java.util.List<DocumentMetadataDto> documents =documentMetaDataService.getAllDocuments();
        return ResponseEntity.ok(
                ApiResponse.<List<DocumentMetadataDto>>
                                builder()
                        .message("All documents is here")
                        .success(true)
                        .timestamp(LocalDateTime.now())
                        .data(documents)
                        .build()
        );
    }

//    //    list all uploaded documents of logged in user
//    @GetMapping("/user")
//    public ResponseEntity<ApiResponse<List<DocumentMetadataDto>>> getAllDocumentOfLoggedInUser(
//            Authentication authentication
//    ){
//        User user=(User)authentication.getPrincipal();
//        java.util.List<DocumentMetadataDto> documents =documentService.getAllDocumentsByUser(user);
//        return ResponseEntity.ok(
//                ApiResponse.<List<DocumentMetadataDto>>
//                                builder()
//                        .message("All documents is here")
//                        .success(true)
//                        .timestamp(LocalDateTime.now())
//                        .data(documents)
//                        .build()
//        );
//    }



    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DocumentMetadataDto>> getDocumentById(@PathVariable UUID id) {
        DocumentMetadataDto document = documentMetaDataService.getDocumentById(id);
        return ResponseEntity.ok(
                ApiResponse.<DocumentMetadataDto>
                                builder()
                        .message("Single document is here")
                        .success(true)
                        .timestamp(LocalDateTime.now())
                        .data(document)
                        .build()
        );
    }

    @DeleteMapping("/{id}") //make sure to delete the data from the vector store also
    public ResponseEntity<ApiResponse<Void>> deleteDocument(@PathVariable UUID id) {
        documentMetaDataService.deleteDocument(id);
        return ResponseEntity.ok(
                ApiResponse.<Void>
                                builder()
                        .message("Document deleted successfully")
                        .success(true)
                        .timestamp(LocalDateTime.now())
                        .data(null)
                        .build()
        );
    }

}
