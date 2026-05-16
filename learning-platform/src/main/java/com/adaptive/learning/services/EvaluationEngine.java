package com.adaptive.learning.services;

import com.adaptive.learning.models.ConfidenceLevel;
import com.adaptive.learning.models.MatrixResult;
import org.springframework.stereotype.Service;

@Service // This tells Spring Boot that this class contains our core business logic
public class EvaluationEngine {

    /**
     * Calculates the true state of competence based on correctness and confidence.
     * 
     * @param isCorrect Was the selected option the correct one?
     * @param confidenceLevel How confident was the user (SURE, NOT_SURE, DONT_KNOW)?
     * @return The resulting state matrix (e.g., MASTERED, MISINFORMED).
     */
    public MatrixResult calculateMatrixState(boolean isCorrect, ConfidenceLevel confidenceLevel) {
        
        // Handle the "I don't know" bypass first
        if (confidenceLevel == ConfidenceLevel.DONT_KNOW) {
            return MatrixResult.NEUTRAL;
        }

        // Logic Tree for "SURE" responses
        if (confidenceLevel == ConfidenceLevel.SURE) {
            if (isCorrect) {
                return MatrixResult.MASTERED;
            } else {
                return MatrixResult.MISINFORMED; // The most critical enterprise state
            }
        }

        // Logic Tree for "NOT_SURE" responses
        if (confidenceLevel == ConfidenceLevel.NOT_SURE) {
            if (isCorrect) {
                return MatrixResult.DOUBTFUL;
            } else {
                return MatrixResult.UNINFORMED;
            }
        }

        // Fallback (Should never hit this in practice)
        return MatrixResult.NEUTRAL;
    }
}