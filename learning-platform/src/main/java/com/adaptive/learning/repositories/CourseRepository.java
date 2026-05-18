package com.adaptive.learning.repositories;

import com.adaptive.learning.models.Course;
import com.adaptive.learning.models.CourseStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CourseRepository extends JpaRepository<Course, Long> {
    List<Course> findByAuthorId(Long authorId);
    List<Course> findByStatus(CourseStatus status);
    List<Course> findByAuthorIdAndStatus(Long authorId, CourseStatus status);
}