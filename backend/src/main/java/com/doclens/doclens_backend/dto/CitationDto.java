package com.doclens.doclens_backend.dto;

import lombok.*;

import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
// a list of sources the answer was built from
public class CitationDto {

    private UUID documentId;
    private String fileName;
    private Integer chunkIndex;
    private Integer pageNumber;
    private String snippet;
    private Double similarityScore;
    private Map<String, Object> metadata;
}
