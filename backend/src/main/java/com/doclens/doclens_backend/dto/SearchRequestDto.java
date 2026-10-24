package com.doclens.doclens_backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@RequiredArgsConstructor
@AllArgsConstructor
@Builder
public class SearchRequestDto {

    @NotBlank(message = "Query cannot be blank")
    private String query;

    private UUID documentId;

    private Integer topK;

    private Double similaritySearch;

}
