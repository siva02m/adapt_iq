package com.adaptive.learning.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "attempts_ledger")
public class AttemptLedger {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // For now, we will store the user ID as a simple number. 
    // Later, you can link this to a full User/Authentication system.
    @Column(nullable = false)
    private Long userId;

    // Which question did they answer?
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    // Which option did they pick? (Nullable because "I don't know" means no option picked)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "selected_option_id")
    private QuestionOption selectedOption;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ConfidenceLevel confidenceLevel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MatrixResult matrixResult;

    @Column(nullable = false)
    private int attemptNumber; // e.g., Is this their 1st or 3rd time trying this question?

    @Column(nullable = false)
    private int roundNumber; // e.g., Which batch session are they in?

    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now(); // Automatically logs the exact time

    // --- GETTERS AND SETTERS ---

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Question getQuestion() { return question; }
    public void setQuestion(Question question) { this.question = question; }

    public QuestionOption getSelectedOption() { return selectedOption; }
    public void setSelectedOption(QuestionOption selectedOption) { this.selectedOption = selectedOption; }

    public ConfidenceLevel getConfidenceLevel() { return confidenceLevel; }
    public void setConfidenceLevel(ConfidenceLevel confidenceLevel) { this.confidenceLevel = confidenceLevel; }

    public MatrixResult getMatrixResult() { return matrixResult; }
    public void setMatrixResult(MatrixResult matrixResult) { this.matrixResult = matrixResult; }

    public int getAttemptNumber() { return attemptNumber; }
    public void setAttemptNumber(int attemptNumber) { this.attemptNumber = attemptNumber; }

    public int getRoundNumber() { return roundNumber; }
    public void setRoundNumber(int roundNumber) { this.roundNumber = roundNumber; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}