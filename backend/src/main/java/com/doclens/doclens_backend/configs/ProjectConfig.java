package com.doclens.doclens_backend.configs;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ProjectConfig {

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("DocLens - AI Document Intelligence & RAG Backend")
                        .description("REST API for DocLens: Multi-format document ingestion, vector embeddings with PostgresSQL pgvector, and RAG-based question answering")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("DocLens")
                                .email("ramany5979@gmail.com")));
    }
}