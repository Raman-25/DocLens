package com.doclens.doclens_backend.service;

import com.doclens.doclens_backend.dto.DocumentMetadataDto;
import com.doclens.doclens_backend.dto.DocumentResponseDto;
import com.doclens.doclens_backend.entity.DocumentMetadata;
import com.doclens.doclens_backend.enums.DocumentStatus;
import com.doclens.doclens_backend.exceptions.DocumentProcessingException;
import com.doclens.doclens_backend.exceptions.ResourceNotFoundException;
import com.doclens.doclens_backend.repository.DocumentMetadataRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.modelmapper.ModelMapper;
import org.springframework.ai.document.Document;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class DocumentMetaDataService {

    private final DocumentMetadataRepository documentMetadataRepository;
    private final DocumentParserService documentParserService;
    private final DocumentIngestionService documentIngestionService;
    private final ModelMapper modelMapper;
    private final JdbcTemplate jdbcTemplate;


    @Transactional
    public DocumentResponseDto uploadAndProcess(MultipartFile file) {

        String fileName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document";
        String contentType = file.getContentType() != null ? file.getContentType() : "application/octet-stream"; // the generic MIME type meaning "unknown binary data"

        //storing the user detail with document metadata
        DocumentMetadata documentMetadata = DocumentMetadata.builder()
                .filename(fileName)
                .contentType(contentType)
                .status(DocumentStatus.UPLOADING)
                .fileSize(file.getSize())
                .createdAt(LocalDateTime.now())
                .build();

        documentMetadata = documentMetadataRepository.save(documentMetadata);

        List<Document> parsedDocs = null;
        int chunksCreated = 0;

        try {
            //Parsing = converting file into plain text.
            parsedDocs = documentParserService.parse(file);

            //ingest service - convert the praisedFile into chunks
            chunksCreated = documentIngestionService.ingest(documentMetadata, parsedDocs); //req the metadata and the praised doc(document) both
        } catch (
                DocumentProcessingException e) {
            log.info("Document metadata deleting due to fail processing");
            documentMetadataRepository.delete(documentMetadata);
            throw e;
        }

        //if no chunk created don't save the file
        if (chunksCreated == 0) {
            throw new DocumentProcessingException("Document appears to be empty or unscannable");
        }

        return DocumentResponseDto.builder()
                .id(documentMetadata.getId())
                .fileName(documentMetadata.getFilename())
                .fileSize(documentMetadata.getFileSize())
                .chunksCreated(chunksCreated)
                .status(documentMetadata.getStatus())
                .message("Document successfully processed and indexed.")
//                .userId(user.getId())
                .build();
    }

    public List<DocumentResponseDto> uploadMultipleDocuments(List<MultipartFile> files) {

        List<DocumentResponseDto> responseDtos = new ArrayList<>();
        for(MultipartFile file: files){
            DocumentResponseDto result = this.uploadAndProcess(file);
            responseDtos.add(result);
        }
        return responseDtos;
    }

    public List<DocumentMetadataDto> getAllDocuments() {

        List<DocumentMetadata> allDocuments = documentMetadataRepository.findAllByOrderByCreatedAtDesc();

        return allDocuments.stream()
                .map(documentMetadata -> modelMapper.map(documentMetadata,DocumentMetadataDto.class))
                .toList();
    }


    public DocumentMetadataDto getDocumentById(UUID id) {
        DocumentMetadata documentMetadata = documentMetadataRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Document with given id not found !!"));
        return modelMapper.map(documentMetadata, DocumentMetadataDto.class);
    }

    @Transactional
    public void deleteDocument(UUID id) {
        DocumentMetadata documentMetadata = documentMetadataRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Document with given id not found !!"));

        documentMetadataRepository.delete(documentMetadata);
        //delete the vector entries
        try {
            String deleteVectorsSql = "DELETE FROM vector_store WHERE metadata->>'documentId' = ?"; //metadata is a JSONB column; ->> reads the value of the key "documentId"
            int deletedCount = jdbcTemplate.update(deleteVectorsSql, id.toString());
            log.info("Deleted {} vector chunks for document id {} ", deletedCount, id); //jdbcTemplate fills it with id.toString(),jdbcTemplate.update(...) — runs the DELETE and returns how many rows were deleted

        } catch (Exception e) {
            log.warn("cloud not delete vectors from vector store directly: {}", e.getMessage());
        }

    }
}
