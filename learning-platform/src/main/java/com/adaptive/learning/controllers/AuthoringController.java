package com.adaptive.learning.controllers;

import com.adaptive.learning.models.Question;
import com.adaptive.learning.models.QuestionOption;
import com.adaptive.learning.repositories.QuestionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/authoring")
@CrossOrigin(origins = "http://localhost:5173") // Enables safe communication with your React frontend
public class AuthoringController {

    @Autowired
    private QuestionRepository questionRepository;

    // Endpoint to allow the Authoring Canvas to save a brand-new question into the database
    @PostMapping("/questions")
    public ResponseEntity<Question> createQuestion(@RequestBody Question question) {
        // Maintain the bidirectional JSON reference link for Jpa/Hibernate mapping
        if (question.getOptions() != null) {
            for (QuestionOption option : question.getOptions()) {
                option.setQuestion(question);
            }
        }
        
        Question savedQuestion = questionRepository.save(question);
        return ResponseEntity.ok(savedQuestion);
    }

    // Endpoint to fetch all questions currently in the system for the authoring index list
    @GetMapping("/questions")
    public ResponseEntity<List<Question>> getAllQuestions() {
        return ResponseEntity.ok(questionRepository.findAll());
    }
}