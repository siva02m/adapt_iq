package com.adaptive.learning.services;

import com.adaptive.learning.models.*;
import com.adaptive.learning.repositories.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import java.util.Arrays;

@Component
public class DatabaseSeeder implements CommandLineRunner {

    private final CourseRepository courseRepository;
    private final LearningObjectiveRepository loRepository;
    private final LearningModuleRepository learningModuleRepository;
    private final QuestionRepository questionRepository;
    private final QuestionOptionRepository optionRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DatabaseSeeder(CourseRepository courseRepository,
            LearningObjectiveRepository loRepository,
            LearningModuleRepository learningModuleRepository,
            QuestionRepository questionRepository,
            QuestionOptionRepository optionRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        this.courseRepository = courseRepository;
        this.loRepository = loRepository;
        this.learningModuleRepository = learningModuleRepository;
        this.questionRepository = questionRepository;
        this.optionRepository = optionRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        // --- DB SCHEMA UPGRADE: Drop obsolete "content" column from learning_modules if it exists to avoid not-null constraint failures ---
        try (java.sql.Connection conn = java.sql.DriverManager.getConnection(
                "jdbc:postgresql://localhost:5432/adaptive_learning", "postgres", "password");
             java.sql.Statement stmt = conn.createStatement()) {
            stmt.execute("ALTER TABLE learning_modules DROP COLUMN IF EXISTS content");
            System.out.println("--- DB SCHEMA FIX: Dropped obsolete 'content' column from learning_modules successfully! ---");
        } catch (Exception e) {
            System.err.println("--- DB SCHEMA FIX ERROR: " + e.getMessage() + " ---");
        }

        // --- Seed default users if they don't exist ---
        ensureUserExists("admin@adaptiq.com", "Platform Admin", "Admin@123", UserRole.ADMIN);
        ensureUserExists("author@adaptiq.com", "Demo Author", "Author@123", UserRole.AUTHOR);
        ensureUserExists("learner@adaptiq.com", "Demo Learner", "Learner@123", UserRole.LEARNER);

        // --- Seed sample course if none exist ---

        // --- Seed sample course if none exist ---
        if (courseRepository.count() == 0) {
            System.out.println("🌱 Seeding sample course data...");

            User author = userRepository.findByEmail("author@adaptiq.com").orElseThrow();

            Course course = new Course();
            course.setTitle("Introduction to Leadership");
            course.setDescription("A foundational course on leadership principles for new and experienced managers.");
            course.setWiifm(
                    "This course will help you lead teams effectively and understand situational leadership rules.");
            course.setStatus(CourseStatus.PUBLISHED);
            course.setRoundSize(3);
            course.setAuthor(author);
            courseRepository.save(course);

            LearningObjective lo = new LearningObjective();
            lo.setTitle("Understand Leadership Styles");
            lo.setDescription("Identify the core differences between Autocratic and Democratic leadership.");
            lo.setCourse(course);
            loRepository.save(lo);

            // Seed a learning module linked to this objective for remediation testing
            LearningModule module = new LearningModule();
            module.setTitle("Deep Dive: Leadership Styles");
            module.setDescription("Learn the nuances of Autocratic versus Democratic leadership models.");
            module.setCourse(course);
            module.setLearningObjective(lo);
            module.setDisplayOrder(1);
            module.setHtmlContent("[{\"id\":\"b1\",\"type\":\"heading\",\"level\":2,\"text\":\"Autocratic vs. Democratic Leadership\"},{\"id\":\"b2\",\"type\":\"paragraph\",\"text\":\"Autocratic leadership keeps decision-making power centralized. While highly efficient in crises, it can limit creativity. Democratic leadership, by contrast, invites collaboration and builds consensus, leading to higher long-term engagement.\"},{\"id\":\"b3\",\"type\":\"alert\",\"variant\":\"info\",\"text\":\"Pro Tip: The best leaders adapt their style to the situation. This is known as situational leadership!\"}]");
            
            // Note: Since LearningModuleController/Repository depends on LearningModule, we must import or declare it.
            // But wait, the repository needs to be wired in. We already have the imports for all models.
            // Let's wire in learningModuleRepository in DatabaseSeeder.
            // Let's look at fields to see if LearningModuleRepository is already wired. It isn't.
            // Let's add it to the constructor.
            learningModuleRepository.save(module);

            Question question = new Question();
            question.setQuestionText(
                    "Which leadership style centralizes all decision-making power within a single leader?");
            question.setPoolType(PoolType.ADAPTIVE_ROUND);
            question.setSubstituteGroupId(101L);
            question.setCustomFeedbackText(
                    "Autocratic leadership keeps absolute control with the leader, while Democratic involves team input.");
            question.setLearningObjective(lo);
            question.setTags(Arrays.asList("Leadership Styles", "Management Basics"));
            questionRepository.save(question);

            QuestionOption optionA = new QuestionOption();
            optionA.setOptionText("Democratic Leadership");
            optionA.setCorrect(false);
            optionA.setQuestion(question);
            optionRepository.save(optionA);

            QuestionOption optionB = new QuestionOption();
            optionB.setOptionText("Autocratic Leadership");
            optionB.setCorrect(true);
            optionB.setQuestion(question);
            optionRepository.save(optionB);

            System.out.println("✅ Sample course data loaded!");
        } else {
            System.out.println("🔍 Database has " + courseRepository.count() + " courses. Re-assigning to Author for demo visibility...");
            User author = userRepository.findByEmail("author@adaptiq.com").orElseThrow();
            courseRepository.findAll().forEach(c -> {
                c.setAuthor(author);
                if (c.getStatus() == null) c.setStatus(CourseStatus.DRAFT);
                courseRepository.save(c);
                System.out.println("🔧 Re-assigned owner to Author for Course: " + c.getTitle());
            });
        }
    }

    private void ensureUserExists(String email, String name, String password, UserRole role) {
        if (!userRepository.existsByEmail(email)) {
            User user = new User();
            user.setEmail(email);
            user.setFullName(name);
            user.setPassword(passwordEncoder.encode(password));
            user.setRole(role);
            userRepository.save(user);
            System.out.println("👤 Created user: " + email);
        }
    }
}