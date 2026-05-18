package com.adaptive.learning.controllers;

import com.adaptive.learning.models.LearningModule;
import com.adaptive.learning.repositories.CourseRepository;
import com.adaptive.learning.repositories.LearningModuleRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/courses/{courseId}/learning-modules")
public class LearningModuleController {

    private final LearningModuleRepository moduleRepository;
    private final CourseRepository courseRepository;

    public LearningModuleController(LearningModuleRepository moduleRepository, CourseRepository courseRepository) {
        this.moduleRepository = moduleRepository;
        this.courseRepository = courseRepository;
    }

    @GetMapping
    public ResponseEntity<List<LearningModule>> getByCourse(@PathVariable Long courseId) {
        return ResponseEntity.ok(moduleRepository.findByCourseIdOrderByDisplayOrderAsc(courseId));
    }

    @PostMapping
    public ResponseEntity<?> create(@PathVariable Long courseId, @RequestBody LearningModule module) {
        try {
            System.out.println("[DEBUG MODULE SAVE] Entering create method! courseId: " + courseId + ", title: " + (module != null ? module.getTitle() : "null"));
            return courseRepository.findById(courseId).map(course -> {
                module.setCourse(course);
                System.out.println("[DEBUG MODULE SAVE] Course found! Saving module...");
                LearningModule saved = moduleRepository.save(module);
                System.out.println("[DEBUG MODULE SAVE] Module saved successfully with id: " + saved.getId());
                return ResponseEntity.status(HttpStatus.CREATED).body((Object) saved);
            }).orElseGet(() -> {
                System.out.println("[DEBUG MODULE SAVE] Course not found with id: " + courseId);
                return ResponseEntity.notFound().build();
            });
        } catch (Exception e) {
            System.err.println("[DEBUG MODULE SAVE] Error occurred while saving module:");
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<LearningModule> update(@PathVariable Long id, @RequestBody LearningModule updated) {
        return moduleRepository.findById(id).map(existing -> {
            existing.setTitle(updated.getTitle());
            existing.setDescription(updated.getDescription());
            existing.setHtmlContent(updated.getHtmlContent());
            existing.setDisplayOrder(updated.getDisplayOrder());
            existing.setLearningObjective(updated.getLearningObjective());
            return ResponseEntity.ok(moduleRepository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        moduleRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Learning module deleted"));
    }
}
