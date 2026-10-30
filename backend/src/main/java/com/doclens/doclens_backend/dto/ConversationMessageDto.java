package com.doclens.doclens_backend.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

// one message of a reloaded conversation — citations ride along only on assistant messages
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ConversationMessageDto {

    private String content;
    private String type;
    private LocalDateTime timestamp;
    private Integer sequenceId;
    private List<CitationDto> citations;
}
