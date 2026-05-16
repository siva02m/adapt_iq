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

    // This custom query finds all unique question IDs where the user's latest or any successful state is MASTERED
    @Query("SELECT DISTINCT a.question.id FROM AttemptLedger a WHERE a.userId = :userId AND a.matrixResult = :matrixResult")
    List<Long> findQuestionIdsByUserIdAndMatrixResult(@Param("userId") Long userId, @Param("matrixResult") MatrixResult matrixResult);
}