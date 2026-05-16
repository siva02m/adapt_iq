package com.adaptive.learning.controllers;

import com.adaptive.learning.dto.EvaluationRequest;
import com.adaptive.learning.models.*;
import com.adaptive.learning.repositories.*;
import com.adaptive.learning.services.EvaluationEngine;
import com.adaptive.learning.services.RoundGeneratorService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/rounds")
@CrossOrigin(origins = "*")
public class RoundController {

    private final EvaluationEngine evaluationEngine;
    private final AttemptLedgerRepository attemptLedgerRepository;
    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository questionOptionRepository;
    private final RoundGeneratorService roundGeneratorService;

public RoundController(EvaluationEngine evaluationEngine,
                           AttemptLedgerRepository attemptLedgerRepository,
                           QuestionRepository questionRepository,
                           QuestionOptionRepository questionOptionRepository,
                           RoundGeneratorService roundGeneratorService) {
        this.evaluationEngine = evaluationEngine;
        this.attemptLedgerRepository = attemptLedgerRepository;
        this.questionRepository = questionRepository;
        this.questionOptionRepository = questionOptionRepository;
        this.roundGeneratorService = roundGeneratorService;
    }

    /**
     * Endpoint: GET /api/rounds/generate
     * Returns a customized set of unmastered questions for the learner.
     */
    @GetMapping("/generate")
    public ResponseEntity<List<Question>> generateRound(@RequestParam Long userId, @RequestParam Long courseId) {
        List<Question> roundQuestions = roundGeneratorService.generateRoundQuestions(userId, courseId);
        return ResponseEntity.ok(roundQuestions);
    }

    @PostMapping("/evaluate")
    public ResponseEntity<String> evaluateAnswer(@RequestBody EvaluationRequest request) {
        
        // 1. Fetch the actual Question from the database using the ID sent by the frontend
        Question question = questionRepository.findById(request.getQuestionId())
                .orElseThrow(() -> new RuntimeException("Question not found with ID: " + request.getQuestionId()));

        // 2. Fetch the selected option (if provided; remember "I don't know" passes null)
        QuestionOption selectedOption = null;
        if (request.getSelectedOptionId() != null) {
            selectedOption = questionOptionRepository.findById(request.getSelectedOptionId())
                    .orElseThrow(() -> new RuntimeException("Option not found with ID: " + request.getSelectedOptionId()));
        }

        // 3. Calculate the matrix result (MASTERED, MISINFORMED, etc.)
        MatrixResult calculatedResult = evaluationEngine.calculateMatrixState(
                request.isCorrect(), 
                request.getConfidenceLevel()
        );

        // 4. Build the ledger entity record
        AttemptLedger ledgerEntry = new AttemptLedger();
        ledgerEntry.setUserId(request.getUserId());
        ledgerEntry.setQuestion(question);
        ledgerEntry.setSelectedOption(selectedOption);
        ledgerEntry.setConfidenceLevel(request.getConfidenceLevel());
        ledgerEntry.setMatrixResult(calculatedResult);
        ledgerEntry.setAttemptNumber(request.getAttemptNumber());
        ledgerEntry.setRoundNumber(request.getRoundNumber());

        // 5. Save the record directly into PostgreSQL
        attemptLedgerRepository.save(ledgerEntry);
        
        // 6. Return response back to the client
        return ResponseEntity.ok("Evaluation saved successfully! State: " + calculatedResult.name());
    }
}