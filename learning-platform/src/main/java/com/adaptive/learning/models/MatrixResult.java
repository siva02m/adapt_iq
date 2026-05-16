package com.adaptive.learning.models;

public enum MatrixResult {
    MASTERED,       // Correct + Sure
    MISINFORMED,    // Incorrect + Sure (Needs custom feedback)
    DOUBTFUL,       // Correct + Not Sure
    UNINFORMED,     // Incorrect + Not Sure
    NEUTRAL         // I Don't Know
}