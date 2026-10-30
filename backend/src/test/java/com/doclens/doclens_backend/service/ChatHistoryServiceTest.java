package com.doclens.doclens_backend.service;

import com.doclens.doclens_backend.dto.ConversationSummaryDto;
import com.doclens.doclens_backend.repository.ChatCitationRepository;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
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
}
