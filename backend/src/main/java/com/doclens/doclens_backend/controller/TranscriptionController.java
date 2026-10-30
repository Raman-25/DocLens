//package com.doclens.doclens_backend.controller;
//
//import com.doclens.doclens_backend.dto.ApiResponse;
//import com.doclens.doclens_backend.service.TranscriptionService;
//import lombok.RequiredArgsConstructor;
//import org.springframework.http.MediaType;
//import org.springframework.http.ResponseEntity;
//import org.springframework.web.bind.annotation.PostMapping;
//import org.springframework.web.bind.annotation.RequestMapping;
//import org.springframework.web.bind.annotation.RequestParam;
//import org.springframework.web.bind.annotation.RestController;
//import org.springframework.web.multipart.MultipartFile;
//
//import java.time.LocalDateTime;
//
//@RestController
//@RequestMapping("/api/v1/chat")
//@RequiredArgsConstructor
//public class TranscriptionController {
//
//    private final TranscriptionService transcriptionService;
//
//    @PostMapping(path = "/transcribe", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
//    public ResponseEntity<ApiResponse<String>> transcribe(@RequestParam("file") MultipartFile file) {
//
//        String text = transcriptionService.transcribe(file);
//
//        return ResponseEntity.ok(ApiResponse.<String>builder()
//                .success(true)
//                .message("Transcription complete")
//                .data(text)
//                .timestamp(LocalDateTime.now())
//                .build()
//        );
//    }
//}
//
//
//}
