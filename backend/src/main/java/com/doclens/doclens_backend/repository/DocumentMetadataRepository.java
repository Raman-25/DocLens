package com.doclens.doclens_backend.repository;

import com.doclens.doclens_backend.entity.DocumentMetadata;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DocumentMetadataRepository extends JpaRepository<DocumentMetadata, UUID> {
//    List<DocumentMetadata> findByOrderByCreatedAtDesc();

    List<DocumentMetadata> findAllByOrderByCreatedAtDesc();
}