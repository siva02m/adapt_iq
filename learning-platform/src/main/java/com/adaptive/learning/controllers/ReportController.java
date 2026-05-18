package com.adaptive.learning.controllers;

import com.adaptive.learning.models.MatrixResult;
import com.adaptive.learning.repositories.AttemptLedgerRepository;
import com.adaptive.learning.repositories.CourseRepository;
import com.adaptive.learning.repositories.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reports")
@PreAuthorize("hasRole('ADMIN')")
public class ReportController {

    private final AttemptLedgerRepository ledgerRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;

    public ReportController(AttemptLedgerRepository ledgerRepository,
                            CourseRepository courseRepository,
                            UserRepository userRepository) {
        this.ledgerRepository = ledgerRepository;
        this.courseRepository = courseRepository;
        this.userRepository = userRepository;
    }

    /** GET /api/reports/summary — platform-wide stats */
    @GetMapping("/summary")
    public ResponseEntity<Map<String, Object>> getSummary() {
        var all = ledgerRepository.findAll();
        long total = all.size();
        long mastered    = all.stream().filter(a -> a.getMatrixResult() == MatrixResult.MASTERED).count();
        long misinformed = all.stream().filter(a -> a.getMatrixResult() == MatrixResult.MISINFORMED).count();

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalLearners", userRepository.count());
        summary.put("totalAttempts", total);
        summary.put("masteredPct",    total > 0 ? Math.round((mastered * 100.0) / total) : 0);
        summary.put("misinformedPct", total > 0 ? Math.round((misinformed * 100.0) / total) : 0);
        summary.put("overconfidencePct", total > 0 ? Math.round((misinformed * 100.0) / total) : 0);
        summary.put("avgMasteryPct",  total > 0 ? Math.round((mastered * 100.0) / total) : 0);
        return ResponseEntity.ok(summary);
    }

    /** GET /api/reports/courses — per-course summary list */
    @GetMapping("/courses")
    public ResponseEntity<List<Map<String, Object>>> getCourseSummaries() {
        var all = ledgerRepository.findAll();
        var courses = courseRepository.findAll();

        List<Map<String, Object>> result = courses.stream().map(course -> {
            var courseAttempts = all.stream()
                .filter(a -> a.getQuestion().getLearningObjective().getCourse().getId().equals(course.getId()))
                .collect(Collectors.toList());

            Map<String, Long> breakdown = Arrays.stream(MatrixResult.values())
                .collect(Collectors.toMap(Enum::name,
                    r -> courseAttempts.stream().filter(a -> a.getMatrixResult() == r).count()));

            Set<Long> learners = courseAttempts.stream().map(a -> a.getUserId()).collect(Collectors.toSet());

            Map<String, Object> row = new HashMap<>();
            row.put("courseId", course.getId());
            row.put("courseTitle", course.getTitle());
            row.put("totalAttempts", courseAttempts.size());
            row.put("totalLearners", learners.size());
            row.put("matrixBreakdown", breakdown);
            return row;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    /** GET /api/reports/courses/{courseId} — full detail for one course */
    @GetMapping("/courses/{courseId}")
    public ResponseEntity<Map<String, Object>> getCourseDetail(@PathVariable Long courseId) {
        var all = ledgerRepository.findAll();
        var courseAttempts = all.stream()
            .filter(a -> a.getQuestion().getLearningObjective().getCourse().getId().equals(courseId))
            .collect(Collectors.toList());

        // Matrix breakdown
        Map<String, Long> breakdown = Arrays.stream(MatrixResult.values())
            .collect(Collectors.toMap(Enum::name,
                r -> courseAttempts.stream().filter(a -> a.getMatrixResult() == r).count()));

        // Top misinformed questions
        var misinformed = courseAttempts.stream()
            .filter(a -> a.getMatrixResult() == MatrixResult.MISINFORMED)
            .collect(Collectors.groupingBy(a -> a.getQuestion().getId(), Collectors.counting()));

        List<Map<String, Object>> topMisinformed = misinformed.entrySet().stream()
            .sorted(Map.Entry.<Long, Long>comparingByValue().reversed())
            .limit(5)
            .map(e -> {
                Map<String, Object> m = new HashMap<>();
                m.put("questionId", e.getKey());
                m.put("count", e.getValue());
                courseAttempts.stream()
                    .filter(a -> a.getQuestion().getId().equals(e.getKey()))
                    .findFirst()
                    .ifPresent(a -> m.put("questionText", a.getQuestion().getQuestionText()));
                return m;
            }).collect(Collectors.toList());

        // Per-LO mastery
        var byLo = courseAttempts.stream()
            .collect(Collectors.groupingBy(a -> a.getQuestion().getLearningObjective()));

        List<Map<String, Object>> loMastery = byLo.entrySet().stream().map(e -> {
            long loTotal = e.getValue().size();
            long loMastered = e.getValue().stream().filter(a -> a.getMatrixResult() == MatrixResult.MASTERED).count();
            Map<String, Object> m = new HashMap<>();
            m.put("loId", e.getKey().getId());
            m.put("title", e.getKey().getTitle());
            m.put("masteryPct", loTotal > 0 ? Math.round((loMastered * 100.0) / loTotal) : 0);
            return m;
        }).collect(Collectors.toList());

        // Per-learner stats
        Map<Long, List<Object>> byUser = new HashMap<>();
        courseAttempts.forEach(a -> byUser.computeIfAbsent(a.getUserId(), k -> new ArrayList<>()).add(a));

        List<Map<String, Object>> learners = byUser.entrySet().stream().map(e -> {
            var attempts = e.getValue().stream()
                .map(o -> (com.adaptive.learning.models.AttemptLedger) o)
                .collect(Collectors.toList());
            long mastered = attempts.stream().filter(a -> a.getMatrixResult() == MatrixResult.MASTERED).count();
            long misinformedCount = attempts.stream().filter(a -> a.getMatrixResult() == MatrixResult.MISINFORMED).count();
            var lastActive = attempts.stream().map(a -> a.getCreatedAt()).max(Comparator.naturalOrder()).orElse(null);

            Map<String, Object> m = new HashMap<>();
            m.put("userId", e.getKey());
            m.put("totalAttempts", attempts.size());
            m.put("mastered", mastered);
            m.put("misinformed", misinformedCount);
            m.put("lastActive", lastActive);
            userRepository.findById(e.getKey()).ifPresent(u -> m.put("fullName", u.getFullName()));
            return m;
        }).collect(Collectors.toList());

        Map<String, Object> detail = new HashMap<>();
        detail.put("matrixBreakdown", breakdown);
        detail.put("topMisinformedQuestions", topMisinformed);
        detail.put("loMastery", loMastery);
        detail.put("learners", learners);
        return ResponseEntity.ok(detail);
    }
}
