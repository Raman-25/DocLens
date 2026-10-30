package com.doclens.doclens_backend.service;

import com.doclens.doclens_backend.dto.CitationDto;
import com.doclens.doclens_backend.dto.ConversationMessageDto;
import com.doclens.doclens_backend.dto.ConversationSummaryDto;
import com.doclens.doclens_backend.entity.ChatCitation;
import com.doclens.doclens_backend.repository.ChatCitationRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ChatHistoryServiceTest {

    @Test
    void getChatList_setsTitles() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        ChatCitationRepository citationRepo = mock(ChatCitationRepository.class);

        List<ConversationSummaryDto> summaries = List.of(
                ConversationSummaryDto.builder().conversationId("convo-1").build(),
                ConversationSummaryDto.builder().conversationId("convo-2").build(),
                ConversationSummaryDto.builder().conversationId("convo-3").build(),
                ConversationSummaryDto.builder().conversationId("convo-4").build()
        );

        List<Map.Entry<String, String>> titleRows = List.of(
                Map.entry("convo-2", "   what   is   rag   and   how    does   it   work   in   simple   words   for   beginners  "),
                Map.entry("convo-3", "hi"),
                Map.entry("convo-4", "   ")
        );

        AtomicInteger call = new AtomicInteger();
        when(jdbcTemplate.query(anyString(), any(RowMapper.class)))
                .thenAnswer(inv -> call.getAndIncrement() == 0 ? summaries : titleRows);

        ChatHistoryService service = new ChatHistoryService(jdbcTemplate, citationRepo);
        List<ConversationSummaryDto> result = service.getChatList();

        assertEquals("New chat", result.get(0).getTitle());
        assertEquals("what is rag and how does it work in simp...", result.get(1).getTitle());
        assertEquals("hi", result.get(2).getTitle());
        assertEquals("New chat", result.get(3).getTitle());
    }

    @Test
    void getMessagesById_zipsCitationsOntoAssistantMessages() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        ChatCitationRepository citationRepo = mock(ChatCitationRepository.class);

        List<ConversationMessageDto> bubble = List.of(
                ConversationMessageDto.builder().content("hello").type("USER").sequenceId(1).build(),
                ConversationMessageDto.builder().content("answer 1").type("ASSISTANT").sequenceId(2).build(),
                ConversationMessageDto.builder().content("answer 2").type("ASSISTANT").sequenceId(3).build(),
                ConversationMessageDto.builder().content("answer 3").type("ASSISTANT").sequenceId(4).build()
        );

        List<CitationDto> group0 = List.of(
                CitationDto.builder().documentId(UUID.randomUUID()).fileName("guide.pdf").chunkIndex(0).pageNumber(1).snippet("chunk one").similarityScore(0.9).build()
        );
        List<CitationDto> group1 = List.of(
                CitationDto.builder().documentId(UUID.randomUUID()).fileName("guide.pdf").chunkIndex(2).pageNumber(3).snippet("chunk two").similarityScore(0.8).build()
        );
        List<ChatCitation> rows = List.of(
                ChatCitation.builder().conversationId("convo-1").assistantIndex(0).citations(group0).build(),
                ChatCitation.builder().conversationId("convo-1").assistantIndex(1).citations(group1).build()
        );

        when(jdbcTemplate.query(anyString(), any(RowMapper.class), anyString()))
                .thenAnswer(inv -> bubble);
        when(citationRepo.findByConversationIdOrderByAssistantIndexAsc("convo-1")).thenReturn(rows);

        ChatHistoryService service = new ChatHistoryService(jdbcTemplate, citationRepo);
        List<ConversationMessageDto> result = service.getMessagesById("convo-1");

        assertNull(result.get(0).getCitations());
        assertEquals(group0, result.get(1).getCitations());
        assertEquals(group1, result.get(2).getCitations());
        assertEquals(List.of(), result.get(3).getCitations());
    }

    @Test
    void saveCitations_ignoresNullAndEmpty() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        ChatCitationRepository citationRepo = mock(ChatCitationRepository.class);
        ChatHistoryService service = new ChatHistoryService(jdbcTemplate, citationRepo);

        service.saveCitations("convo-1", null);
        service.saveCitations("convo-1", List.of());

        verify(citationRepo, never()).save(any(ChatCitation.class));
    }

    @Test
    void saveCitations_savesWithNextIndexAndSurvivesDuplicate() {
        JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
        ChatCitationRepository citationRepo = mock(ChatCitationRepository.class);
        ChatHistoryService service = new ChatHistoryService(jdbcTemplate, citationRepo);

        List<CitationDto> pills = List.of(
                CitationDto.builder().documentId(UUID.randomUUID()).fileName("guide.pdf").chunkIndex(0).pageNumber(1).snippet("chunk").similarityScore(0.9).build()
        );

        when(citationRepo.countByConversationId("convo-1")).thenReturn(2L);
        ArgumentCaptor<ChatCitation> captor = ArgumentCaptor.forClass(ChatCitation.class);
        service.saveCitations("convo-1", pills);

        verify(citationRepo).save(captor.capture());
        assertEquals("convo-1", captor.getValue().getConversationId());
        assertEquals(Integer.valueOf(2), captor.getValue().getAssistantIndex());
        assertEquals(pills, captor.getValue().getCitations());

        when(citationRepo.save(any(ChatCitation.class))).thenThrow(new DataIntegrityViolationException("dup"));
        assertDoesNotThrow(() -> service.saveCitations("convo-1", pills));
    }
}
