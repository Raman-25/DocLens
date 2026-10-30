package com.doclens.doclens_backend.entity;

import com.doclens.doclens_backend.dto.CitationDto;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(
        name = "chat_citations",
        uniqueConstraints = @UniqueConstraint(columnNames = {"conversation_id", "assistant_index"})
)
@Getter
@Setter
@AllArgsConstructor
@Builder
@RequiredArgsConstructor
public class ChatCitation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String conversationId;

    @Column(nullable = false)
    private Integer assistantIndex;  //to seq like 0,1,2, to the citations

    // the whole citation array (List<CitationDto>) as one JSON document
    @JdbcTypeCode(SqlTypes.JSON)  //saving in JSONB
    @Column(name = "citations", columnDefinition = "jsonb", nullable = false)
    private List<CitationDto> citations;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist // run before the first save
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
