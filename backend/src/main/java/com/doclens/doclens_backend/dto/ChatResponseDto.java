package com.doclens.doclens_backend.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@RequiredArgsConstructor
@AllArgsConstructor
@Builder
public class ChatResponseDto {
    private String answer;
    private String conversationId;
    private List<CitationDto> citations;
    private Long responseTimeMs;
}
