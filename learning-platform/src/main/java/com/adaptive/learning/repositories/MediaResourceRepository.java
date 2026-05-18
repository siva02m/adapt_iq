package com.adaptive.learning.repositories;

import com.adaptive.learning.models.MediaResource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MediaResourceRepository extends JpaRepository<MediaResource, Long> {
    List<MediaResource> findByCourseId(Long courseId);
    List<MediaResource> findByIsGlobalTrue(); // Global resources
}
