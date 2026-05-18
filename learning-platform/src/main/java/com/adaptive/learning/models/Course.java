package com.adaptive.learning.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.ArrayList;

@Entity
@Table(name = "courses")
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String wiifm; // What's In It For Me

    @Enumerated(EnumType.STRING)
    @Column(nullable = true)
    private CourseStatus status = CourseStatus.DRAFT;

    @Column(name = "thumbnail_url")
    private String thumbnailUrl;

    @Column(name = "estimated_duration_minutes")
    private Integer estimatedDurationMinutes;

    @Column(length = 10)
    private String language = "en";

    @Column(length = 20)
    private String version = "1.0";

    @Column(name = "round_size")
    private Integer roundSize = 5;

    @Column(name = "is_questions_randomized")
    private Boolean isQuestionsRandomized = true;

    @Column(name = "is_options_randomized")
    private Boolean isOptionsRandomized = true;

    @Column(name = "passing_score_percent")
    private Integer passingScorePercent = 80;

    @Column(name = "max_attempts")
    private Integer maxAttempts = 3;

    // Author who created this course
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = true)
    private User author;

    @Column(name = "created_at", nullable = true)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @ElementCollection
    @CollectionTable(name = "course_tags", joinColumns = @JoinColumn(name = "course_id"))
    @Column(name = "tag")
    private List<String> tags = new ArrayList<>();

    @Column(name = "global_resources_enabled")
    private Boolean globalResourcesEnabled = false;

    /** If true, learning modules are part of this course's adaptive path. */
    @Column(name = "enable_learning_modules")
    private Boolean enableLearningModules = true;

    /** If true, a final certification exam is appended after adaptive mastery. */
    @Column(name = "enable_final_exam")
    private Boolean enableFinalExam = false;

    /** Controls how the sidebar and navigation buttons behave in the course player. */
    @Enumerated(EnumType.STRING)
    @Column(name = "navigation_mode", length = 20)
    private NavigationMode navigationMode = NavigationMode.PROGRESSIVE;

    // --- Getters and Setters ---

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getWiifm() { return wiifm; }
    public void setWiifm(String wiifm) { this.wiifm = wiifm; }

    public CourseStatus getStatus() { return status; }
    public void setStatus(CourseStatus status) { this.status = status; }

    public String getThumbnailUrl() { return thumbnailUrl; }
    public void setThumbnailUrl(String thumbnailUrl) { this.thumbnailUrl = thumbnailUrl; }

    public Integer getEstimatedDurationMinutes() { return estimatedDurationMinutes; }
    public void setEstimatedDurationMinutes(Integer estimatedDurationMinutes) { this.estimatedDurationMinutes = estimatedDurationMinutes; }

    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }

    public String getVersion() { return version; }
    public void setVersion(String version) { this.version = version; }

    public Integer getRoundSize() { return roundSize; }
    public void setRoundSize(Integer roundSize) { this.roundSize = roundSize; }

    public Boolean isQuestionsRandomized() { return isQuestionsRandomized; }
    public void setQuestionsRandomized(Boolean questionsRandomized) { isQuestionsRandomized = questionsRandomized; }

    public Boolean isOptionsRandomized() { return isOptionsRandomized; }
    public void setOptionsRandomized(Boolean optionsRandomized) { isOptionsRandomized = optionsRandomized; }

    public Integer getPassingScorePercent() { return passingScorePercent; }
    public void setPassingScorePercent(Integer passingScorePercent) { this.passingScorePercent = passingScorePercent; }

    public Integer getMaxAttempts() { return maxAttempts; }
    public void setMaxAttempts(Integer maxAttempts) { this.maxAttempts = maxAttempts; }

    public User getAuthor() { return author; }
    public void setAuthor(User author) { this.author = author; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public List<String> getTags() { return tags; }
    public void setTags(List<String> tags) { this.tags = tags; }

    public Boolean getGlobalResourcesEnabled() { return globalResourcesEnabled; }
    public void setGlobalResourcesEnabled(Boolean globalResourcesEnabled) { this.globalResourcesEnabled = globalResourcesEnabled; }

    public Boolean getEnableLearningModules() { return enableLearningModules; }
    public void setEnableLearningModules(Boolean enableLearningModules) { this.enableLearningModules = enableLearningModules; }

    public Boolean getEnableFinalExam() { return enableFinalExam; }
    public void setEnableFinalExam(Boolean enableFinalExam) { this.enableFinalExam = enableFinalExam; }

    public NavigationMode getNavigationMode() { return navigationMode; }
    public void setNavigationMode(NavigationMode navigationMode) { this.navigationMode = navigationMode; }
}