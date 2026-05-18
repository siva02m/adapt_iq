package com.adaptive.learning.repositories;

import com.adaptive.learning.models.LearningObjective;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface LearningObjectiveRepository extends JpaRepository<LearningObjective, Long> {
    List<LearningObjective> findByCourseId(Long courseId);
}