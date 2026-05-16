package com.adaptive.learning.services;

import com.adaptive.learning.models.*;
import com.adaptive.learning.repositories.*;
import org.springframework.stereotype.Service;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class RoundGeneratorService {

    private final QuestionRepository questionRepository;
    private final AttemptLedgerRepository attemptLedgerRepository;
    private final CourseRepository courseRepository;

    public RoundGeneratorService(QuestionRepository questionRepository,
                                 AttemptLedgerRepository attemptLedgerRepository,
                                 CourseRepository courseRepository) {
        this.questionRepository = questionRepository;
        this.attemptLedgerRepository = attemptLedgerRepository;
        this.courseRepository = courseRepository;
    }

    /**
     * Generates a tailored list of questions for a student's learning round.
     */
    public List<Question> generateRoundQuestions(Long userId, Long courseId) {
        // 1. Fetch the course rules to determine batch size and randomization settings
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new RuntimeException("Course not found with ID: " + courseId));
        int limit = course.getRoundSize();

        // 2. Scan the ledger to find what this user has already MASTERED
        List<Long> masteredQuestionIds = attemptLedgerRepository
                .findQuestionIdsByUserIdAndMatrixResult(userId, MatrixResult.MASTERED);

        // 3. Pull the remaining pool of adaptive questions
        List<Question> rawPool;
        if (masteredQuestionIds.isEmpty()) {
            rawPool = questionRepository.findByLearningObjectiveCourseIdAndPoolType(courseId, PoolType.ADAPTIVE_ROUND);
        } else {
            rawPool = questionRepository.findAvailableQuestions(courseId, PoolType.ADAPTIVE_ROUND, masteredQuestionIds);
        }

        // 4. Shuffle the questions if the author enabled randomization
        if (course.isQuestionsRandomized()) {
            Collections.shuffle(rawPool);
        }

        // 5. Slice the pool down to the exact round size requested
        return rawPool.stream()
                .limit(limit)
                .collect(Collectors.toList());
    }
}