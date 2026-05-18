package com.adaptive.learning.services;

import com.adaptive.learning.models.*;
import com.adaptive.learning.repositories.*;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
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
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new RuntimeException("Course not found"));
        int limit = course.getRoundSize();

        // 1. Identify already MASTERED questions to exclude them from the fresh pool
        List<Long> masteredQuestionIds = attemptLedgerRepository
                .findQuestionIdsByUserIdAndMatrixResultAndCourseId(userId, MatrixResult.MASTERED, courseId);

        // 2. Identify all question IDs the user has EVER attempted in this course
        List<Long> allAttemptedQuestionIds = attemptLedgerRepository
                .findAllAttemptedQuestionIdsByUserIdAndCourseId(userId, courseId);

        // 3. Compute "Ghost Questions" (attempted but NEVER mastered): Attempted minus Mastered
        List<Long> unmasteredQuestionIds = new ArrayList<>(allAttemptedQuestionIds);
        unmasteredQuestionIds.removeAll(masteredQuestionIds);

        // 4. Prioritize the unmastered questions first, ensuring we only pull from the ADAPTIVE_ROUND pool
        List<Question> prioritizedPool = questionRepository.findAllById(unmasteredQuestionIds)
                .stream()
                .filter(q -> q.getPoolType() == PoolType.ADAPTIVE_ROUND)
                .collect(Collectors.toCollection(ArrayList::new));

        // 5. If we still have room in the round, pull fresh questions
        if (prioritizedPool.size() < limit) {
            List<Long> excludeIds = new ArrayList<>();
            excludeIds.addAll(masteredQuestionIds);
            excludeIds.addAll(unmasteredQuestionIds);

            List<Question> freshQuestions = questionRepository.findAvailableQuestions(
                    courseId, PoolType.ADAPTIVE_ROUND, excludeIds.isEmpty() ? List.of(-1L) : excludeIds);

            prioritizedPool.addAll(freshQuestions);
        }

        // 6. Practice/Review Fallback: If all questions are fully mastered, load all of them as a review round
        if (prioritizedPool.isEmpty()) {
            prioritizedPool = questionRepository.findByLearningObjectiveCourseIdAndPoolType(courseId, PoolType.ADAPTIVE_ROUND);
        }

        // 7. Apply author's randomization and limit to roundSize
        if (course.isQuestionsRandomized()) {
            Collections.shuffle(prioritizedPool);
        }

        return prioritizedPool.stream().limit(limit).collect(Collectors.toList());
    }
}