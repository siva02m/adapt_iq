package com.adaptive.learning.models;

import jakarta.persistence.*;
import java.util.List;


@Entity
@Table(name = "questions")
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String questionText;

    // Strict lock: Can only be ADAPTIVE_ROUND or FINAL_EXAM
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PoolType poolType;

    // Used to group rephrased questions together
    @Column(name = "substitute_group_id")
    private Long substituteGroupId;

    @Column(name = "is_options_randomized")
    private boolean isOptionsRandomized = true;

    // The specific feedback to show if they are "Misinformed"
    @Column(columnDefinition = "TEXT")
    private String customFeedbackText;

    // Relationship: Links this question to a specific Learning Objective
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "learning_objective_id", nullable = false)
    private LearningObjective learningObjective;

    // This tells Java to store a list of Strings (tags) for this question
    @ElementCollection
    @CollectionTable(name = "question_tags", joinColumns = @JoinColumn(name = "question_id"))
    @Column(name = "tag")
    private List<String> tags;

    // New Relationship: Automatically fetches all options linked to this question
    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, fetch = FetchType.EAGER)
    private List<QuestionOption> options;

    // --- GETTERS AND SETTERS ---

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getQuestionText() { return questionText; }
    public void setQuestionText(String questionText) { this.questionText = questionText; }

    public PoolType getPoolType() { return poolType; }
    public void setPoolType(PoolType poolType) { this.poolType = poolType; }

    public Long getSubstituteGroupId() { return substituteGroupId; }
    public void setSubstituteGroupId(Long substituteGroupId) { this.substituteGroupId = substituteGroupId; }

    public boolean isOptionsRandomized() { return isOptionsRandomized; }
    public void setOptionsRandomized(boolean optionsRandomized) { isOptionsRandomized = optionsRandomized; }

    public String getCustomFeedbackText() { return customFeedbackText; }
    public void setCustomFeedbackText(String customFeedbackText) { this.customFeedbackText = customFeedbackText; }

    public LearningObjective getLearningObjective() { return learningObjective; }
    public void setLearningObjective(LearningObjective learningObjective) { this.learningObjective = learningObjective; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }

    public List<QuestionOption> getOptions() { return options;}
    public void setOptions(List<QuestionOption> options) { this.options = options; }

}