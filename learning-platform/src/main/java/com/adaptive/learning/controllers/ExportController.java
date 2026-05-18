package com.adaptive.learning.controllers;

import com.adaptive.learning.services.ExportService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/courses/{id}")
public class ExportController {

    private final ExportService exportService;

    public ExportController(ExportService exportService) {
        this.exportService = exportService;
    }

    @GetMapping("/export")
    @PreAuthorize("hasAnyRole('AUTHOR', 'ADMIN')")
    public ResponseEntity<Map<String, Object>> exportCourse(@PathVariable Long id) {
        return ResponseEntity.ok(exportService.exportCourse(id));
    }

    @PostMapping("/import")
    @PreAuthorize("hasAnyRole('AUTHOR', 'ADMIN')")
    public ResponseEntity<?> importCourse(@PathVariable Long id, @RequestBody Map<String, Object> data) {
        exportService.importCourse(id, data);
        return ResponseEntity.ok(Map.of("message", "Course imported successfully"));
    }
}
