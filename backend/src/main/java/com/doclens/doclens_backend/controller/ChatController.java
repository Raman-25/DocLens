package com.doclens.doclens_backend.controller;

import com.doclens.doclens_backend.dto.*;
import com.doclens.doclens_backend.service.RagService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
public class ChatController {

    private final RagService ragService;

    @PostMapping("/query")
    //Ask a question against all documents or a specific document with citations
    public ResponseEntity<ApiResponse<ChatResponseDto>> askQuestion(@Valid @RequestBody ChatRequestDto requestDto){

        ChatResponseDto chatResponseDto = ragService.askQuestion(requestDto);
        return ResponseEntity.ok(
                ApiResponse.
                        <ChatResponseDto>
                        builder()
                        .success(true)
                        .message(null)
                        .data(chatResponseDto)
                        .timestamp(LocalDateTime.now())
                        .build()
        );
    }

    //TEXT_EVENT_STREAM_VALUE is the declaration that makes this endpoint a real live stream instead of a normal JSON response
    @PostMapping(value = "/stream", produces = org.springframework.http.MediaType.TEXT_EVENT_STREAM_VALUE)
    //Stream real-time Q&A answer tokens via Server-Sent Events (SSE)
    public Flux<String> streamQuestion(@Valid @RequestBody ChatRequestDto requestDto){
        return ragService.streamQuestionAnswer(requestDto);
    }

    @PostMapping("/search/similarity")
    // "Perform semantic similarity search on stored document vectors")
    public ResponseEntity<ApiResponse<SearchResultDto>> searchSimilar(
            @Valid @RequestBody SearchRequestDto request) {

        SearchResultDto results = ragService.searchSimilarChunks(request);
        return ResponseEntity.ok(
                ApiResponse.
                        <SearchResultDto>
                        builder()
                        .success(true)
                        .message(null)
                        .data(results)
                        .timestamp(LocalDateTime.now())
                        .build()
        );
    }
}
