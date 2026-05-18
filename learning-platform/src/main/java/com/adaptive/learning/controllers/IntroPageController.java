package com.adaptive.learning.controllers;

import com.adaptive.learning.models.IntroPage;
import com.adaptive.learning.repositories.CourseRepository;
import com.adaptive.learning.repositories.IntroPageRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/courses/{courseId}/intro-pages")
public class IntroPageController {

    private final IntroPageRepository introPageRepository;
    private final CourseRepository courseRepository;

    public IntroPageController(IntroPageRepository introPageRepository, CourseRepository courseRepository) {
        this.introPageRepository = introPageRepository;
        this.courseRepository = courseRepository;
    }

    @GetMapping
    public ResponseEntity<List<IntroPage>> getByCourse(@PathVariable Long courseId) {
        return ResponseEntity.ok(introPageRepository.findByCourseIdOrderByDisplayOrderAsc(courseId));
    }

    @PostMapping
    public ResponseEntity<IntroPage> create(@PathVariable Long courseId, @RequestBody IntroPage introPage) {
        return courseRepository.findById(courseId).map(course -> {
            introPage.setCourse(course);
            return ResponseEntity.status(HttpStatus.CREATED).body(introPageRepository.save(introPage));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<IntroPage> update(@PathVariable Long id, @RequestBody IntroPage updated) {
        return introPageRepository.findById(id).map(existing -> {
            existing.setTitle(updated.getTitle());
            existing.setContent(updated.getContent());
            existing.setDisplayOrder(updated.getDisplayOrder());
            return ResponseEntity.ok(introPageRepository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        introPageRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Intro page deleted"));
    }
}
