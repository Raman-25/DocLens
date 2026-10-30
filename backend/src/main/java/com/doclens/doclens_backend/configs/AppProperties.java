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

    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    public static class RagProperties {
        private int chunkSize = 600;
        private  int minChunkSizeChars=350;  //chunk's total length — letters, spaces, dots, everything included — must cross 350.
        private  int minChunkLengthToEmbed=5;  //any leftover chunk shorter than 5 chars
        private  int maxNumChunks=10000;  //a safety cap
        //        private int chunkOverlap = 10ntend0;
        private int topK = 3;
        private double similarityThreshold = 0.0;
    }
}
