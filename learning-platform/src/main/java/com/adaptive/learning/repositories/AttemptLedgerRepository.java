package com.adaptive.learning.repositories;

import com.adaptive.learning.models.AttemptLedger;
import com.adaptive.learning.models.MatrixResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AttemptLedgerRepository extends JpaRepository<AttemptLedger, Long> {

        @Query("SELECT DISTINCT a.question.id FROM AttemptLedger a WHERE a.userId = :userId AND a.matrixResult = :matrixResult")
        List<Long> findQuestionIdsByUserIdAndMatrixResult(@Param("userId") Long userId,
                        @Param("matrixResult") MatrixResult matrixResult);

        @Query("SELECT DISTINCT a.question.id FROM AttemptLedger a WHERE a.userId = :userId AND a.matrixResult != :matrixResult")
        List<Long> findQuestionIdsByUserIdAndMatrixResultNot(@Param("userId") Long userId,
                        @Param("matrixResult") MatrixResult matrixResult);

        @Query("SELECT DISTINCT a.question.id FROM AttemptLedger a WHERE a.userId = :userId")
        List<Long> findAllAttemptedQuestionIdsByUserId(@Param("userId") Long userId);

        @Query("SELECT DISTINCT a.question.id FROM AttemptLedger a " +
               "WHERE a.userId = :userId " +
               "AND a.matrixResult = :matrixResult " +
               "AND a.question.learningObjective.course.id = :courseId")
        List<Long> findQuestionIdsByUserIdAndMatrixResultAndCourseId(
                @Param("userId") Long userId,
                @Param("matrixResult") MatrixResult matrixResult,
                @Param("courseId") Long courseId);

        @Query("SELECT DISTINCT a.question.id FROM AttemptLedger a " +
               "WHERE a.userId = :userId " +
               "AND a.question.learningObjective.course.id = :courseId")
        List<Long> findAllAttemptedQuestionIdsByUserIdAndCourseId(
                @Param("userId") Long userId,
                @Param("courseId") Long courseId);
}