package com.adaptive.learning.models;

import jakarta.persistence.*;

@Entity
@Table(name = "courses")
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String wiifm; // What's In It For Me

    @Column(name = "round_size")
    private int roundSize = 5; // Default round size defined by the author

    @Column(name = "is_questions_randomized")
    private boolean isQuestionsRandomized = true;

    // --- GETTERS AND SETTERS ---
    // These allow other parts of our app to read and write data to these variables safely.

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getWiifm() {
        return wiifm;
    }

    public void setWiifm(String wiifm) {
        this.wiifm = wiifm;
    }

    public int getRoundSize() {
        return roundSize;
    }

    public void setRoundSize(int roundSize) {
        this.roundSize = roundSize;
    }

    public boolean isQuestionsRandomized() {
        return isQuestionsRandomized;
    }

    public void setQuestionsRandomized(boolean questionsRandomized) {
        isQuestionsRandomized = questionsRandomized;
    }
}