package com.adaptive.learning.services;

import com.adaptive.learning.models.*;
import com.adaptive.learning.repositories.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import java.util.Arrays;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    private final CourseRepository courseRepository;
    private final LearningObjectiveRepository loRepository;
    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository optionRepository;

    public DatabaseSeeder(CourseRepository courseRepository,
                          LearningObjectiveRepository loRepository,
                          QuestionRepository questionRepository,
                          QuestionOptionRepository optionRepository) {
        this.courseRepository = courseRepository;
        this.loRepository = loRepository;
        this.questionRepository = questionRepository;
        this.optionRepository = optionRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        // Only seed data if the database is completely empty
        if (courseRepository.count() == 0) {
            System.out.println("🌱 Database is empty. Seeding sample compliance course data...");

            // 1. Create a Demo Course
            Course course = new Course();
            course.setTitle("Introduction to Leadership");
            course.setWiifm("This course will help you lead teams effectively and understand situational leadership rules.");
            course.setRoundSize(3);
            courseRepository.save(course);

            // 2. Create a Learning Objective (LO)
            LearningObjective lo = new LearningObjective();
            lo.setTitle("Understand Leadership Styles");
            lo.setDescription("Identify the core differences between Autocratic and Democratic leadership.");
            lo.setCourse(course);
            loRepository.save(lo);

            // 3. Create a Confidence-Based Question
            Question question = new Question();
            question.setQuestionText("Which leadership style centralizes all decision-making power within a single leader?");
            question.setPoolType(PoolType.ADAPTIVE_ROUND);
            question.setSubstituteGroupId(101L); // Baseline ID for future variations
            question.setCustomFeedbackText("Remember: Autocratic leadership keeps absolute control with the leader, while Democratic involves team input.");
            question.setLearningObjective(lo);
            question.setTags(Arrays.asList("Leadership Styles", "Management Basics"));
            questionRepository.save(question);

            // 4. Create Options for the Question
            QuestionOption optionA = new QuestionOption();
            optionA.setOptionText("Democratic Leadership");
            optionA.setCorrect(false);
            optionA.setQuestion(question);
            optionRepository.save(optionA);

            QuestionOption optionB = new QuestionOption();
            optionB.setOptionText("Autocratic Leadership");
            optionB.setCorrect(true); // The correct answer
            optionB.setQuestion(question);
            optionRepository.save(optionB);

            System.out.println("✅ Sample data successfully loaded! Question ID: " + question.getId() + " | Option B ID: " + optionB.getId());
        } else {
            System.out.println("🔍 Database already has data. Skipping seeder.");
        }
    }
}