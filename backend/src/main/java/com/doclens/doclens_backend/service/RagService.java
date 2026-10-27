package com.doclens.doclens_backend.service;

import com.doclens.doclens_backend.configs.AppProperties;
import com.doclens.doclens_backend.dto.*;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.filter.FilterExpressionBuilder;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RagService {

    private static final Logger log = LoggerFactory.getLogger(RagService.class);

    private final VectorStore vectorStore;
    private final ChatClient chatClient;
    private final AppProperties appProperties;

    //to ask anything related to document
    public ChatResponseDto askQuestion(ChatRequestDto request){

        long startTime = System.currentTimeMillis();

        String question = request.getQuestion();
        String conversationId = request.getConversationId() != null
                ? request.getConversationId()
                : UUID.randomUUID().toString();

        log.info("Processing query: '{}', scoped documentId: {}", request.getQuestion(), request.getDocumentId());

        List<Document> similarDocuments = this.retrieveRelevantDocuments(
                request.getQuestion(),
                request.getDocumentId(),
                request.getTopK(),
                request.getMinSimilarity()
        );

        List<CitationDto> citationDtos = similarDocuments.stream()
                .map(this::mapToCitation)
                .toList();

        String contextText = buildContextString(similarDocuments);

//        String prompt = buildPrompt(request.getQuestion(),contextText);

        String answer = this.chatClient.prompt()
                .system(s -> s.param("doc_context", contextText))   //set the system message for this call
                .user(question)
                .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, conversationId))  //set the convo id for the chat memory
                .call()
                .content();

        long responseTime = System.currentTimeMillis() - startTime;

        return ChatResponseDto.builder()
                .answer(answer)
                .conversationId(request.getConversationId() != null ? request.getConversationId() : UUID.randomUUID().toString())
                .citations(citationDtos)
                .responseTimeMs(responseTime)
                .build();


    }

    //this streams
    public Flux<String> streamQuestionAnswer(ChatRequestDto requestDto) {
        log.info("Streaming query: '{}'", requestDto.getQuestion());

        String question = requestDto.getQuestion();
        String conversationId = requestDto.getConversationId() != null
                ? requestDto.getConversationId()
                : UUID.randomUUID().toString();

        List<Document> relevantDocuments = retrieveRelevantDocuments(
                requestDto.getQuestion(),
                requestDto.getDocumentId(),
                requestDto.getTopK(),
                requestDto.getMinSimilarity());

        String contextText = buildContextString(relevantDocuments);
//        String userPrompt = buildPrompt(requestDto.getQuestion(), contextText);

        return chatClient.prompt()
                .system(s -> s.param("doc_context", contextText))
                .user(question)
                .advisors(a -> a.param(ChatMemory.CONVERSATION_ID,conversationId))
                .stream()
                .content();

       // Flux<String> = a stream of many string pieces arriving over time (Spring WebFlux)
       //MessageChatMemoryAdvisor loads past messages and saves new ones, but needs to know which conversation
        // .advisors(a -> a.param(...)) passes that ID for this one call only
    }

    //to get the similar chunks according to the request
    public SearchResultDto searchSimilarChunks(SearchRequestDto request) {

        List<Document> matchedDocs = this.retrieveRelevantDocuments(
                request.getQuery(),
                request.getDocumentId(),
                request.getTopK(),
                request.getSimilaritySearch()
        );

        List<CitationDto> citations = matchedDocs.stream()    //we get the similar document convert to the citation
                .map(this::mapToCitation)
                .toList();

        return SearchResultDto.builder()
                .query(request.getQuery())
                .totalMatches(citations.size())
                .matches(citations)
                .build();

    }


//    private String buildPrompt(@NotBlank(message = "Question cannot be empty") String question, String contextText) {
//
//        //String.format fills the first %s with contextText
//        if (contextText != null && !contextText.isBlank()) {
//            return String.format("""
//                       Document Context:
//                       ---------------------
//                       %s
//                       ---------------------
//                       User Message / Question: %s
//                       Instructions:
//                       - If the user's question relates to the document context above, prioritize answering using that context and reference key sections.
//                       - If the user is asking a general question, greeting, or discussing topics beyond the document context, respond helpfully and conversationally using your general knowledge while weaving in relevant document context if applicable
//                """, contextText, question);
//        } else {
//            return String.format("""
//                   User Message / Question:
//                   %s
//                   Instructions:
//                      - Respond helpfully, accurately, and conversationally to the user's message using your broad knowledge base.
//                """, question);
//        }
//    }

    private String buildContextString(List<Document> similarDocuments) {
        if (similarDocuments == null || similarDocuments.isEmpty()) {
            return "";
        }

        return similarDocuments.stream().map(doc -> {
            String fileName = (String) doc.getMetadata().getOrDefault("fileName", "Unknown File");
            Object page = doc.getMetadata().getOrDefault("pageNumber", "N/A");
            return String.format("[Source: %s | Page: %s]\n%s", fileName, page, doc.getText());
        }).collect(Collectors.joining("\n\n---\n\n"));

    }

    private List<Document> retrieveRelevantDocuments(@NotBlank(message = "Question cannot be empty") String query, UUID documentId, Integer topK, Double similaritySearch) {

        int effectiveTopK = (topK != null && topK > 0) ? topK : appProperties.getRag().getTopK(); //if top k not there use the prop one
        double effectiveSimilarity = (similaritySearch != null) ? similaritySearch : appProperties.getRag().getSimilarityThreshold(); //same


        //Search request used for searching relevant documents from the vector db
        SearchRequest.Builder searchRequestBuilder = new SearchRequest
                .Builder()
                .query(query)
                .topK(effectiveTopK);

        if (effectiveSimilarity > 0.0) {
            searchRequestBuilder.similarityThreshold(effectiveSimilarity);
        }
        if(documentId!=null){  //check if document and chunk have the same ids
            FilterExpressionBuilder b = new FilterExpressionBuilder();
            searchRequestBuilder.filterExpression(b.eq("documentId",documentId.toString()).build());
        }

        try {
            List<Document>documents = vectorStore.similaritySearch(searchRequestBuilder.build());
            return documents;
        }
        catch (Exception e) {
            log.error("Similarity search failed for query: '{}'", query, e);
            return Collections.emptyList();
        }


    }

    private CitationDto mapToCitation(Document document) {

        Map<String, Object> meta = document.getMetadata();

        UUID docId = null;
        if (meta.get("documentId") != null) {
            try {
                docId = UUID.fromString(meta.get("documentId").toString());
            } catch (Exception ignore) {
            }
        }

        Integer chunkIndex = null;
        if (meta.get("chunkIndex") instanceof Number n) {
            chunkIndex = n.intValue();
        }

        Integer pageNumber = null;
        if (meta.get("pageNumber") instanceof Number n) {
            pageNumber = n.intValue();
        } else if (meta.get("page_number") instanceof Number n) {
            pageNumber = n.intValue();
        }
        Double score = null;
        if (meta.get("distance") instanceof Number n) {
            score = 1.0 - n.doubleValue();
        }

        return CitationDto.builder()
                .documentId(docId)
                .fileName((String) meta.getOrDefault("fileName", "Unknown"))
                .chunkIndex(chunkIndex)
                .pageNumber(pageNumber)
                .snippet(document.getText())
                .similarityScore(score)
                .metadata(meta)
                .build();

    }

}
