package com.doclens.doclens_backend.service;
import com.doclens.doclens_backend.exceptions.DocumentProcessingException;
import com.drew.lang.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.reader.pdf.PagePdfDocumentReader;
import org.springframework.ai.reader.pdf.config.PdfDocumentReaderConfig;
import org.springframework.ai.reader.tika.TikaDocumentReader;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.ai.document.Document;
import java.io.IOException;
import java.util.List;

//Document is the standard box in which a text travels through the entire Spring AI pipeline
// — text inside, metadata stuck on the outside like a label.


@Service
public class DocumentParserService {

    private final static Logger log = LoggerFactory.getLogger(DocumentParserService.class);

    public List<Document> parse(MultipartFile file) {

        String fileName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document";
        String contentType = file.getContentType() != null ? file.getContentType().toLowerCase() : "";

        log.info("Parsing document: {}, size: {} bytes, contentType: {}", fileName, file.getSize(), contentType);


      // the actual parser does not accept the Multipart File is needs to be wrap in the Resource
        try{
            Resource resource = new ByteArrayResource(file.getBytes()){
                @Override
                public @Nullable String getFilename() {
                    return fileName;
                }
            };

            if(fileName.toLowerCase().endsWith(".pdf") || contentType.contains("pdf")){
                return prasePdf(resource);
            }
            else{
                return parseGenericFile(resource);
            }

        }
        catch (IOException e) {
            log.error("Failed to read file bytes {}", fileName, e);
            throw new DocumentProcessingException("Could not read uploaded file : " + fileName, e);
        } catch (Exception e) {
            log.error("Error during document parsing: {}", fileName, e);
            throw new DocumentProcessingException("Failed to parse document content: " + fileName, e);
        }

    }

    // PDF-specific parser
    private List<Document> prasePdf(Resource resource) {

        PdfDocumentReaderConfig config = PdfDocumentReaderConfig.builder()
                .withPageTopMargin(0)
                .withPageBottomMargin(0)
                .build();

        PagePdfDocumentReader documentReader = new PagePdfDocumentReader(resource,config);

        return documentReader.read();  //Output: List<Document>  (Document = text + metadata)
    }

    //Tika - for all other formats also includes the pdf
    private List<Document> parseGenericFile(Resource resource) {
        TikaDocumentReader documentReader = new TikaDocumentReader(resource);
        return documentReader.read();

    }
}
