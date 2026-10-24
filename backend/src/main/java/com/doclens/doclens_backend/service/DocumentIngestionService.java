package com.doclens.doclens_backend.service;

import com.doclens.doclens_backend.configs.AppProperties;
import com.doclens.doclens_backend.entity.DocumentMetadata;
import com.doclens.doclens_backend.enums.DocumentStatus;
import com.doclens.doclens_backend.exceptions.DocumentProcessingException;
import com.doclens.doclens_backend.repository.DocumentMetadataRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.document.Document;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;


@Service
@RequiredArgsConstructor
public class DocumentIngestionService {

    private static final Logger log = LoggerFactory.getLogger(DocumentIngestionService.class);

    private final VectorStore vectorStore;
    private final DocumentMetadataRepository documentMetadataRepository;
    private final AppProperties appProperties;

    public int ingest(DocumentMetadata documentMetadata, List<Document> parsedDocs) {

        log.info("Ingesting document [id={}, name={}, size={}]",
                documentMetadata.getId(), documentMetadata.getFilename(), documentMetadata.getFileSize());

        try {
            documentMetadata.setStatus(DocumentStatus.PROCESSING);
            documentMetadata.setTotalPages(parsedDocs.size());

            //1. Text chunking using TokenTextSplitter

            TokenTextSplitter tokenTextSplitter = TokenTextSplitter.builder()
                    .withChunkSize(appProperties.getRag().getChunkSize())
                    .withMinChunkSizeChars(appProperties.getRag().getMinChunkSizeChars())
                    .withMinChunkLengthToEmbed(appProperties.getRag().getMinChunkLengthToEmbed())
                    .withMaxNumChunks(appProperties.getRag().getMaxNumChunks())
                    .withKeepSeparator(true)
                    .build();

            List<Document> chunks = tokenTextSplitter.apply(parsedDocs);
            if (chunks.isEmpty()) {
                documentMetadata.setStatus(DocumentStatus.FAILED);
                documentMetadata.setErrorMessage("Document appears to be empty or unscannable");
                documentMetadataRepository.save(documentMetadata);
                return 0;
            }

            // 2. Meta data enrichment on each chunk
            List<Document> enrichedChunks = new ArrayList<>();  //this chunks will be used for the embeddings

            for (int i = 0; i < chunks.size(); i++) {
                Document chunk = chunks.get(i);  //get each chunk and stamp it with and identity

                Map<String, Object> enrichedMetadata = new HashMap<>(chunk.getMetadata()); //setting more metadata
                enrichedMetadata.put("documentId", documentMetadata.getId().toString());
                enrichedMetadata.put("fileName", documentMetadata.getFilename());
                enrichedMetadata.put("contentType", documentMetadata.getContentType());
                enrichedMetadata.put("chunkIndex", i);


                // Preserve or calculate page number if available
                Object pageNumber = chunk.getMetadata().get("page_number");
                if (pageNumber == null) {
                    pageNumber = chunk.getMetadata().get("pageNumber");
                }
                if (pageNumber != null) {
                    enrichedMetadata.put("pageNumber", pageNumber);
                }

                //created a new document of chunks and there metadata
                Document enrichedDoc = new Document(chunk.getText(), enrichedMetadata);
                enrichedChunks.add(enrichedDoc);
            }

            //3. write chunks and embedding to pg vector
            log.info("Writing {} vector chunks to PgVectorStore for document: {}", enrichedChunks.size(), documentMetadata.getFilename());
            vectorStore.add(enrichedChunks);  //vectorStore.add() calls it internally: EmbeddingModel bean is autoconfigured from my YAML


            //4. Update document status to index
            documentMetadata.setStatus(DocumentStatus.INDEXED);
            documentMetadata.setTotalChunks(enrichedChunks.size());
            documentMetadata.setErrorMessage(null);
            documentMetadataRepository.save(documentMetadata);
            log.info("Successfully indexed document [id={}, name={}, chunks={}]", documentMetadata.getId(), documentMetadata.getFilename(), enrichedChunks.size());

            return enrichedChunks.size();  //returning the count of chunks created

        } catch (Exception ex) {
            log.error("Failed to ingest document into vector store: {}", documentMetadata.getFilename(), ex);
            documentMetadata.setStatus(DocumentStatus.FAILED);
            documentMetadata.setErrorMessage(ex.getMessage());
            documentMetadataRepository.save(documentMetadata);
            throw new DocumentProcessingException("Failed to index document: " + ex.getMessage(), ex);

        }

    }

}