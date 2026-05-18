package com.adaptive.learning.repositories;

import com.adaptive.learning.models.IntroPage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface IntroPageRepository extends JpaRepository<IntroPage, Long> {
    List<IntroPage> findByCourseIdOrderByDisplayOrderAsc(Long courseId);
}
