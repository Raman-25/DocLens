package com.doclens.doclens_backend.configs;


import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "app")
@Getter
@Setter
public class AppProperties {

    private RagProperties rag = new RagProperties();
    private CorsProperties cors = new CorsProperties();

    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    public static class CorsProperties {
        private String allowedOrigins = "*";
        private String allowedMethods = "GET,POST,PUT,DELETE,OPTIONS";
        private String allowedHeaders = "*";
    }

    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    public static class RagProperties {
        private int chunkSize = 600;
        private  int minChunkSizeChars=350;  //chunk's total length — letters, spaces, dots, everything included — must cross 350.
        private  int minChunkLengthToEmbed=5;  //any leftover chunk shorter than 5 chars
        private  int maxNumChunks=10000;  //a safety cap
        //        private int chunkOverlap = 100;
        private int topK = 5;
        private double similarityThreshold = 0.0;
    }
}
