package com.doclens.doclens_backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "chat message")
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)      //one chat can have many convo
    @JoinColumn(name = "message_type", nullable = false)
    private Conversation conversation;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Column(nullable = false,updatable = false)
    private LocalDateTime createdAt;
}
