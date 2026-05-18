package com.adaptive.learning.controllers;

import com.adaptive.learning.models.LearningObjective;
import com.adaptive.learning.repositories.CourseRepository;
import com.adaptive.learning.repositories.LearningObjectiveRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/courses/{courseId}/learning-objectives")
public class LearningObjectiveController {

    private final LearningObjectiveRepository loRepository;
    private final CourseRepository courseRepository;

    public LearningObjectiveController(LearningObjectiveRepository loRepository,
                                       CourseRepository courseRepository) {
        this.loRepository = loRepository;
        this.courseRepository = courseRepository;
    }

    @GetMapping
    public ResponseEntity<List<LearningObjective>> getAll(@PathVariable Long courseId) {
        return ResponseEntity.ok(loRepository.findByCourseId(courseId));
    }

    @PostMapping
    public ResponseEntity<LearningObjective> create(@PathVariable Long courseId,
                                                     @RequestBody LearningObjective lo) {
        return courseRepository.findById(courseId).map(course -> {
            lo.setCourse(course);
            return ResponseEntity.status(HttpStatus.CREATED).body(loRepository.save(lo));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<LearningObjective> update(@PathVariable Long courseId,
                                                     @PathVariable Long id,
                                                     @RequestBody LearningObjective updated) {
        return loRepository.findById(id).map(lo -> {
            lo.setTitle(updated.getTitle());
            lo.setDescription(updated.getDescription());
            return ResponseEntity.ok(loRepository.save(lo));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long courseId, @PathVariable Long id) {
        loRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }
}
