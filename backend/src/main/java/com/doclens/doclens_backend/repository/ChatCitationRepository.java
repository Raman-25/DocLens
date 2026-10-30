package com.doclens.doclens_backend.repository;

import com.doclens.doclens_backend.entity.ChatCitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ChatCitationRepository extends JpaRepository<ChatCitation, UUID> {

    List<ChatCitation> findByConversationIdOrderByAssistantIndexAsc(String conversationId);

    long countByConversationId(String conversationId); //used for assigning index
}