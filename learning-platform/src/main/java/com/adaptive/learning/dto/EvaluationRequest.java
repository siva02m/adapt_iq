package com.adaptive.learning.dto;

import com.adaptive.learning.models.ConfidenceLevel;
import com.fasterxml.jackson.annotation.JsonProperty;

public class EvaluationRequest {
    
    // This is the exact JSON structure React will send to Java when a user submits an answer
    private Long userId;
    private Long questionId;
    private Long selectedOptionId; // Can be null if they clicked "I don't know"
    private ConfidenceLevel confidenceLevel;
    private int attemptNumber;
    private int roundNumber;
    @JsonProperty("isCorrect") // Forces Jackson to look for "isCorrect" in the JSON
    private boolean isCorrect; // React will tell us if the option they picked was correct

    // --- GETTERS AND SETTERS ---

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public Long getQuestionId() { return questionId; }
    public void setQuestionId(Long questionId) { this.questionId = questionId; }

    public Long getSelectedOptionId() { return selectedOptionId; }
    public void setSelectedOptionId(Long selectedOptionId) { this.selectedOptionId = selectedOptionId; }

    public ConfidenceLevel getConfidenceLevel() { return confidenceLevel; }
    public void setConfidenceLevel(ConfidenceLevel confidenceLevel) { this.confidenceLevel = confidenceLevel; }

    public int getAttemptNumber() { return attemptNumber; }
    public void setAttemptNumber(int attemptNumber) { this.attemptNumber = attemptNumber; }

    public int getRoundNumber() { return roundNumber; }
    public void setRoundNumber(int roundNumber) { this.roundNumber = roundNumber; }

    public boolean isCorrect() { return isCorrect; }
    public void setCorrect(boolean correct) { isCorrect = correct; }
}