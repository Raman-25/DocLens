package com.doclens.doclens_backend.service;

import com.doclens.doclens_backend.dto.CitationDto;
import com.doclens.doclens_backend.dto.ConversationMessageDto;
import com.doclens.doclens_backend.dto.ConversationSummaryDto;
import com.doclens.doclens_backend.entity.ChatCitation;
import com.doclens.doclens_backend.repository.ChatCitationRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ChatHistoryServiceEdgeCasesTest {

    @Test
    void getChatList_emptyReturnsEmpty() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        ChatCitationRepository citationRepo = mock(ChatCitationRepository.class);

        AtomicInteger call = new AtomicInteger();
        when(jdbcTemplate.query(anyString(), any(RowMapper.class)))
                .thenAnswer(inv -> call.getAndIncrement() == 0 ? List.of() : List.of());

        ChatHistoryService service = new ChatHistoryService(jdbcTemplate, citationRepo);
        List<ConversationSummaryDto> result = service.getChatList();

        assertTrue(result.isEmpty());
    }

    @Test
    void getChatList_singleChatWithNoTitleRowFallsBackToNewChat() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        ChatCitationRepository citationRepo = mock(ChatCitationRepository.class);

        List<ConversationSummaryDto> summaries = List.of(
                ConversationSummaryDto.builder().conversationId("convo-9").build()
        );

        AtomicInteger call = new AtomicInteger();
        when(jdbcTemplate.query(anyString(), any(RowMapper.class)))
                .thenAnswer(inv -> call.getAndIncrement() == 0 ? summaries : List.of());

        ChatHistoryService service = new ChatHistoryService(jdbcTemplate, citationRepo);
        List<ConversationSummaryDto> result = service.getChatList();

        assertEquals(1, result.size());
        assertEquals("New chat", result.get(0).getTitle());
    }

    @Test
    void getMessagesById_noCitationRowsGivesEmptyListToAssistant() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        ChatCitationRepository citationRepo = mock(ChatCitationRepository.class);

        List<ConversationMessageDto> bubble = List.of(
                ConversationMessageDto.builder().content("hello").type("USER").sequenceId(1).build(),
                ConversationMessageDto.builder().content("answer").type("ASSISTANT").sequenceId(2).build()
        );

        when(jdbcTemplate.query(anyString(), any(RowMapper.class), anyString()))
                .thenAnswer(inv -> bubble);
        when(citationRepo.findByConversationIdOrderByAssistantIndexAsc("convo-1"))
                .thenReturn(List.of());

        ChatHistoryService service = new ChatHistoryService(jdbcTemplate, citationRepo);
        List<ConversationMessageDto> result = service.getMessagesById("convo-1");

        assertNull(result.get(0).getCitations());
        assertEquals(List.of(), result.get(1).getCitations());
    }

    @Test
    void saveCitations_firstSaveUsesIndexZero() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        ChatCitationRepository citationRepo = mock(ChatCitationRepository.class);
        ChatHistoryService service = new ChatHistoryService(jdbcTemplate, citationRepo);

        List<CitationDto> pills = List.of(
                CitationDto.builder().documentId(UUID.randomUUID()).fileName("guide.pdf")
                        .chunkIndex(0).pageNumber(1).snippet("chunk").similarityScore(0.9).build()
        );

        when(citationRepo.countByConversationId("convo-1")).thenReturn(0L);
        ArgumentCaptor<ChatCitation> captor = ArgumentCaptor.forClass(ChatCitation.class);

        service.saveCitations("convo-1", pills);

        verify(citationRepo).save(captor.capture());
        assertEquals(0, captor.getValue().getAssistantIndex());
        assertEquals("convo-1", captor.getValue().getConversationId());
    }

    @Test
    void saveCitations_countFiveUsesIndexFive() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        ChatCitationRepository citationRepo = mock(ChatCitationRepository.class);
        ChatHistoryService service = new ChatHistoryService(jdbcTemplate, citationRepo);

        List<CitationDto> pills = List.of(
                CitationDto.builder().documentId(UUID.randomUUID()).fileName("guide.pdf")
                        .chunkIndex(1).pageNumber(2).snippet("chunk").similarityScore(0.8).build()
        );

        when(citationRepo.countByConversationId("convo-2")).thenReturn(5L);
        ArgumentCaptor<ChatCitation> captor = ArgumentCaptor.forClass(ChatCitation.class);

        service.saveCitations("convo-2", pills);

        verify(citationRepo).save(captor.capture());
        assertEquals(5, captor.getValue().getAssistantIndex());
        assertEquals(pills, captor.getValue().getCitations());
    }

    @Test
    void chatCitation_builderKeepsFields() {
        List<CitationDto> pills = List.of(
                CitationDto.builder().documentId(UUID.randomUUID()).fileName("guide.pdf")
                        .chunkIndex(0).pageNumber(1).snippet("chunk").similarityScore(0.9).build()
        );

        ChatCitation row = ChatCitation.builder()
                .conversationId("convo-1")
                .assistantIndex(3)
                .citations(pills)
                .build();

        assertEquals("convo-1", row.getConversationId());
        assertEquals(3, row.getAssistantIndex());
        assertEquals(pills, row.getCitations());
    }
}
