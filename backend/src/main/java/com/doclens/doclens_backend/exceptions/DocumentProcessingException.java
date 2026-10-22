package com.doclens.doclens_backend.exceptions;

public class DocumentProcessingException extends RuntimeException {

    public DocumentProcessingException(String message) {
        super(message);
    }

    public DocumentProcessingException() {
        super("Error in processing the document");
    }

    public DocumentProcessingException(String m, Throwable ex) {
        super(m, ex);
    }
}
