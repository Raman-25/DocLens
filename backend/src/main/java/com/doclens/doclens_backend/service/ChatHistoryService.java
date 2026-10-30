package com.doclens.doclens_backend.service;

import com.doclens.doclens_backend.dto.CitationDto;
import com.doclens.doclens_backend.dto.ConversationMessageDto;
import com.doclens.doclens_backend.dto.ConversationSummaryDto;
import com.doclens.doclens_backend.entity.ChatCitation;
import com.doclens.doclens_backend.repository.ChatCitationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatHistoryService {

    private final JdbcTemplate jdbcTemplate;
    private final ChatCitationRepository chatCitationRepository;


    public List<ConversationSummaryDto> getChatList() {

        List<ConversationSummaryDto> summaries = jdbcTemplate.query(
                """
                        SELECT conversation_id, COUNT(*) AS message_count, MAX("timestamp") AS last_updated
                        FROM spring_ai_chat_memory
                        GROUP BY conversation_id
                        ORDER BY last_updated DESC
                        LIMIT 50
                        """,
                (rs, rowNum) -> ConversationSummaryDto.builder()
                        .conversationId(rs.getString("conversation_id"))
                        .messageCount(rs.getLong("message_count"))
                        .lastUpdated(rs.getTimestamp("last_updated").toLocalDateTime())
                        .build()
        );

        List<Map.Entry<String, String>> titleRows = jdbcTemplate.query(
                """
                        SELECT DISTINCT ON (conversation_id) conversation_id, content
                        FROM spring_ai_chat_memory
                        WHERE type = 'USER'
                        ORDER BY conversation_id, sequence_id ASC
                        """,
                // here we are getting the list of map {(convo 1, hi), (convo2,what is),}
                (rs, rowNum) -> Map.entry(rs.getString("conversation_id"), rs.getString("content")));

        Map<String, String> titles = new HashMap<>();
        for (Map.Entry<String, String> row : titleRows) {    //here we taking the list and mapping in to hasmap like hi- convo1, what is dtos- convo 2
            titles.put(row.getKey(), row.getValue());
        }

        for (ConversationSummaryDto summary : summaries) {
            summary.setTitle(toTitles(titles.get(summary.getConversationId())));
        }

        return summaries;
    }

    public List<ConversationMessageDto> getMessagesById(String id) {

        List<ConversationMessageDto> bubble = jdbcTemplate.query(
                """
                        SELECT content, type, "timestamp", sequence_id
                        FROM spring_ai_chat_memory
                        WHERE conversation_id = ?
                        ORDER BY sequence_id ASC
                        """,

                (rs, rowNum) -> ConversationMessageDto
                        .builder()
                        .content(rs.getString("content"))
                        .type(rs.getString("type"))
                        .timestamp(rs.getTimestamp("timestamp").toLocalDateTime())
                        .sequenceId(rs.getInt("sequence_id"))
                        .build(),
                id  //id passes to the sql query above ?
        );

    List<ChatCitation> citations = chatCitationRepository.findByConversationIdOrderByAssistantIndexAsc(id);

        int assistantIndex = 0;
        for (ConversationMessageDto message : bubble) {
            if (message.getType().equals("ASSISTANT")) {
                if (assistantIndex < citations.size()) {
                    message.setCitations(citations.get(assistantIndex).getCitations());
                } else {
                    message.setCitations(List.of());
                }
                assistantIndex++;
            }
        }

        return bubble;

    }

    //for stamping and saving the citation in seq in the citation repo
    public void saveCitations(String conversationId, List<CitationDto> citations) {
        if (citations == null || citations.isEmpty()) {
            return;
        }
        long nextIndex = chatCitationRepository.countByConversationId(conversationId);  // get the count of row and using is to sequence the assistant index
        ChatCitation row = ChatCitation.builder()
                .conversationId(conversationId)
                .assistantIndex((int) nextIndex)
                .citations(citations)
                .build();
        try {
            chatCitationRepository.save(row);
        } catch (DataIntegrityViolationException e) {
            log.warn("Citation group already saved for conversation {} index {}", conversationId, nextIndex);
        }
    }


    private String toTitles(String s) {

        if (s == null || s.isBlank()) {
            return "New chat";
        }
        else {
            String title = s.replaceAll("\\s+", " ").trim();
            return title.length() > 40 ? title.substring(0, 40) + "..." : title;
        }
    }

    }


