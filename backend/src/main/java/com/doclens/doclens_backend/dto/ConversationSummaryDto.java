package com.doclens.doclens_backend.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
//For the chat history list
public class ConversationSummaryDto {
    private String conversationId;
    private String title;
    private long messageCount;
    private LocalDateTime lastUpdated;
}
