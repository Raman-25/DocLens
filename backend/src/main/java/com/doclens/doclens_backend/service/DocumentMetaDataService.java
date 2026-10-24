package com.doclens.doclens_backend.service;

import com.doclens.doclens_backend.dto.DocumentResponseDto;
import com.doclens.doclens_backend.entity.DocumentMetadata;
import com.doclens.doclens_backend.enums.DocumentStatus;
import com.doclens.doclens_backend.exceptions.DocumentProcessingException;
import com.doclens.doclens_backend.repository.DocumentMetadataRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class DocumentMetaDataService {

    private final DocumentMetadataRepository documentMetadataRepository;
    private final DocumentParserService documentParserService;
    private final DocumentIngestionService documentIngestionService;


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
}
