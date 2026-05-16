package com.adaptive.learning.repositories;

import com.adaptive.learning.models.PoolType;
import com.adaptive.learning.models.Question;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface QuestionRepository extends JpaRepository<Question, Long> {

    // Fetch all active adaptive questions for a specific Learning Objective, excluding mastered ones
    @Query("SELECT q FROM Question q WHERE q.learningObjective.course.id = :courseId " +
           "AND q.poolType = :poolType " +
           "AND q.id NOT IN :masteredIds")
    List<Question> findAvailableQuestions(@Param("courseId") Long courseId, 
                                          @Param("poolType") PoolType poolType, 
                                          @Param("masteredIds") List<Long> masteredIds);

    // If no questions are mastered yet, our 'NOT IN' list will be empty, which can break SQL. 
    // So we also need a fallback method to pull everything when there are zero mastered questions.
    List<Question> findByLearningObjectiveCourseIdAndPoolType(Long courseId, PoolType poolType);
}