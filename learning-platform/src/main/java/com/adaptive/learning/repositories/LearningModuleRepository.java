package com.adaptive.learning.repositories;

import com.adaptive.learning.models.LearningModule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface LearningModuleRepository extends JpaRepository<LearningModule, Long> {
    List<LearningModule> findByCourseIdOrderByDisplayOrderAsc(Long courseId);

    /** Returns only modules tied to one of the given LO IDs, ordered by displayOrder. */
    List<LearningModule> findByCourseIdAndLearningObjectiveIdInOrderByDisplayOrderAsc(
            Long courseId, List<Long> loIds);
}
