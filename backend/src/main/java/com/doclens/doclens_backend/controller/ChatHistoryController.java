package com.doclens.doclens_backend.controller;

import com.doclens.doclens_backend.dto.ApiResponse;
import com.doclens.doclens_backend.dto.CitationDto;
import com.doclens.doclens_backend.dto.ConversationMessageDto;
import com.doclens.doclens_backend.dto.ConversationSummaryDto;
import com.doclens.doclens_backend.service.ChatHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/chat/conversations")
@RequiredArgsConstructor
public class ChatHistoryController {

    private final ChatHistoryService chatHistoryService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ConversationSummaryDto>>> getChatList(){

        List<ConversationSummaryDto> list = chatHistoryService.getChatList();

        return ResponseEntity.ok(ApiResponse.
                <List<ConversationSummaryDto>>
                builder()
                .success(true)
                .message(null)
                .data(list)
                .timestamp(LocalDateTime.now())
                .build()
        );
    }

    @GetMapping("/{id}/messages")
    public ResponseEntity<ApiResponse<List<ConversationMessageDto>>> getMessageByID(@PathVariable String id){

        List<ConversationMessageDto> messageDtos = chatHistoryService.getMessagesById(id);

        return ResponseEntity.ok(ApiResponse.<List<ConversationMessageDto>>builder()
                .success(true)
                .message(null)
                .data(messageDtos)
                .timestamp(LocalDateTime.now())
                .build()
        );
    }

    //So this post is fired by the frontend at time of Streaming to save citations as streaming(flux) doest give back citations
    //frontend gets citation by firing the /similaritySearch parallel to the query with the same topk etc. and then this method to save citation
    @PostMapping("/{id}/citations")
    public ResponseEntity<ApiResponse<Void>> saveCitations(
            @PathVariable String id,
            @RequestBody List<CitationDto> citations) {
        chatHistoryService.saveCitations(id, citations);
        return ResponseEntity.status(HttpStatus.CREATED).body(
                ApiResponse.<Void>builder()
                        .success(true)
                        .message("Citations saved")
                        .data(null)
                        .timestamp(LocalDateTime.now())
                        .build()
        );
    }

}
