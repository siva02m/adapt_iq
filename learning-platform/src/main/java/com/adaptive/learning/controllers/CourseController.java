package com.adaptive.learning.controllers;

import com.adaptive.learning.models.Course;
import com.adaptive.learning.models.CourseStatus;
import com.adaptive.learning.models.User;
import com.adaptive.learning.repositories.CourseRepository;
import com.adaptive.learning.repositories.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/courses")
public class CourseController {

    private final CourseRepository courseRepository;
    private final UserRepository userRepository;

    public CourseController(CourseRepository courseRepository, UserRepository userRepository) {
        this.courseRepository = courseRepository;
        this.userRepository = userRepository;
    }

    /**
     * GET /api/courses
     * Admin sees all courses; Author sees only their own courses.
     */
    @GetMapping
    public ResponseEntity<List<Course>> getCourses(Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();
        List<Course> courses = switch (user.getRole()) {
            case ADMIN -> courseRepository.findAll();
            case AUTHOR -> courseRepository.findByAuthorId(user.getId());
            case LEARNER -> courseRepository.findByStatus(CourseStatus.PUBLISHED);
            default -> List.of();
        };
        return ResponseEntity.ok(courses);
    }

    /** POST /api/courses — Author or Admin creates a course */
    @PostMapping
    @PreAuthorize("hasAnyRole('AUTHOR', 'ADMIN')")
    public ResponseEntity<Course> createCourse(@RequestBody Course course, Authentication authentication) {
        User user = userRepository.findByEmail(authentication.getName()).orElseThrow();
        course.setAuthor(user);
        if (course.getStatus() == null)
            course.setStatus(CourseStatus.DRAFT);
        if (course.getCreatedAt() == null)
            course.setCreatedAt(LocalDateTime.now());
        course.setUpdatedAt(LocalDateTime.now());
        return ResponseEntity.status(HttpStatus.CREATED).body(courseRepository.save(course));
    }

    /** GET /api/courses/{id} — Get full course detail */
    @GetMapping("/{id}")
    public ResponseEntity<Course> getCourse(@PathVariable Long id, Authentication authentication) {
        return courseRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** PUT /api/courses/{id} — Update course */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('AUTHOR', 'ADMIN')")
    public ResponseEntity<Course> updateCourse(@PathVariable Long id,
            @RequestBody Course updated,
            Authentication authentication) {
        return courseRepository.findById(id).map(course -> {
            course.setTitle(updated.getTitle());
            course.setDescription(updated.getDescription());
            course.setWiifm(updated.getWiifm());
            course.setThumbnailUrl(updated.getThumbnailUrl());
            course.setEstimatedDurationMinutes(updated.getEstimatedDurationMinutes());
            course.setLanguage(updated.getLanguage());
            course.setVersion(updated.getVersion());
            course.setRoundSize(updated.getRoundSize());
            course.setQuestionsRandomized(updated.isQuestionsRandomized());
            course.setOptionsRandomized(updated.isOptionsRandomized());
            course.setPassingScorePercent(updated.getPassingScorePercent());
            course.setMaxAttempts(updated.getMaxAttempts());
            if (updated.getGlobalResourcesEnabled() != null) {
                course.setGlobalResourcesEnabled(updated.getGlobalResourcesEnabled());
            }
            course.setUpdatedAt(LocalDateTime.now());
            return ResponseEntity.ok(courseRepository.save(course));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** PUT /api/courses/{id}/status — Publish or archive */
    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('AUTHOR', 'ADMIN')")
    public ResponseEntity<?> updateStatus(@PathVariable Long id,
            @RequestBody Map<String, String> body) {
        return courseRepository.findById(id).map(course -> {
            course.setStatus(CourseStatus.valueOf(body.get("status").toUpperCase()));
            course.setUpdatedAt(LocalDateTime.now());
            courseRepository.save(course);
            return ResponseEntity.ok(Map.of("status", course.getStatus().name()));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** DELETE /api/courses/{id} — Admin or owning Author can delete */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('AUTHOR', 'ADMIN')")
    public ResponseEntity<?> deleteCourse(@PathVariable Long id, Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        return courseRepository.findById(id).map(course -> {
            // Authors can only delete their own courses
            if (user.getRole().name().equals("AUTHOR") &&
                    !course.getAuthor().getId().equals(user.getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "You can only delete your own courses"));
            }
            courseRepository.delete(course);
            return ResponseEntity.ok(Map.of("message", "Course deleted"));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** GET /api/courses/{id}/tags */
    @GetMapping("/{id}/tags")
    public ResponseEntity<List<String>> getTags(@PathVariable Long id) {
        return courseRepository.findById(id)
                .map(course -> ResponseEntity.ok(course.getTags()))
                .orElse(ResponseEntity.notFound().build());
    }

    /** PUT /api/courses/{id}/tags */
    @PutMapping("/{id}/tags")
    @PreAuthorize("hasAnyRole('AUTHOR', 'ADMIN')")
    public ResponseEntity<List<String>> updateTags(@PathVariable Long id,
            @RequestBody Map<String, List<String>> payload) {
        return courseRepository.findById(id).map(course -> {
            course.setTags(payload.get("tags"));
            course.setUpdatedAt(LocalDateTime.now());
            courseRepository.save(course);
            return ResponseEntity.ok(course.getTags());
        }).orElse(ResponseEntity.notFound().build());
    }
}
