package com.adaptive.learning.controllers;

import com.adaptive.learning.models.Question;
import com.adaptive.learning.models.PoolType;
import com.adaptive.learning.models.QuestionOption;
import com.adaptive.learning.repositories.QuestionRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
public class QuestionController {

    private final QuestionRepository questionRepository;

    public QuestionController(QuestionRepository questionRepository) {
        this.questionRepository = questionRepository;
    }

    /** GET /api/courses/{courseId}/questions?pool=ADAPTIVE_ROUND|FINAL_EXAM */
    @GetMapping("/api/courses/{courseId}/questions")
    public ResponseEntity<List<Question>> getQuestions(@PathVariable Long courseId,
                                                        @RequestParam(required = false) String pool) {
        List<Question> questions;
        if (pool != null) {
            PoolType poolType = PoolType.valueOf(pool.toUpperCase());
            questions = questionRepository.findByLearningObjectiveCourseIdAndPoolType(courseId, poolType);
        } else {
            questions = questionRepository.findByLearningObjectiveCourseId(courseId);
        }
        return ResponseEntity.ok(questions);
    }

    /** PUT /api/authoring/questions/{id} */
    @PutMapping("/api/authoring/questions/{id}")
    public ResponseEntity<Question> updateQuestion(@PathVariable Long id,
                                                    @RequestBody Question updated) {
        return questionRepository.findById(id).map(q -> {
            q.setQuestionText(updated.getQuestionText());
            q.setCustomFeedbackText(updated.getCustomFeedbackText());
            q.setPoolType(updated.getPoolType());
            q.setLearningObjective(updated.getLearningObjective());
            if (updated.getOptions() != null) {
                for (QuestionOption opt : updated.getOptions()) {
                    opt.setQuestion(q);
                }
                q.setOptions(updated.getOptions());
            }
            return ResponseEntity.ok(questionRepository.save(q));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** DELETE /api/authoring/questions/{id} */
    @DeleteMapping("/api/authoring/questions/{id}")
    public ResponseEntity<?> deleteQuestion(@PathVariable Long id) {
        questionRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Question deleted"));
    }
}
