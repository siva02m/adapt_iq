package com.adaptive.learning.controllers;

import com.adaptive.learning.models.MediaResource;
import com.adaptive.learning.repositories.CourseRepository;
import com.adaptive.learning.repositories.MediaResourceRepository;
import com.adaptive.learning.services.ResourceLifecycleService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class ResourceController {

    private final MediaResourceRepository resourceRepository;
    private final CourseRepository courseRepository;
    private final ResourceLifecycleService lifecycleService;

    public ResourceController(MediaResourceRepository resourceRepository, CourseRepository courseRepository, ResourceLifecycleService lifecycleService) {
        this.resourceRepository = resourceRepository;
        this.courseRepository = courseRepository;
        this.lifecycleService = lifecycleService;
        
        // Ensure uploads directory exists
        try {
            Files.createDirectories(Paths.get("uploads"));
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize storage", e);
        }
    }

    private String saveFile(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) return null;
        String filename = UUID.randomUUID().toString() + "_" + file.getOriginalFilename().replaceAll("[^a-zA-Z0-9\\.\\-]", "_");
        Path destinationFile = Paths.get("uploads").resolve(Paths.get(filename)).normalize().toAbsolutePath();
        Files.copy(file.getInputStream(), destinationFile, StandardCopyOption.REPLACE_EXISTING);
        return "/api/uploads/" + filename; // We will proxy this in Vite, or serve directly from backend at /uploads
    }

    /** GET /api/courses/{courseId}/resources */
    @GetMapping("/courses/{courseId}/resources")
    public ResponseEntity<List<MediaResource>> getCourseResources(@PathVariable Long courseId) {
        return ResponseEntity.ok(resourceRepository.findByCourseId(courseId));
    }

    /** POST /api/courses/{courseId}/resources */
    @PostMapping(value = "/courses/{courseId}/resources", consumes = "multipart/form-data")
    @PreAuthorize("hasAnyRole('AUTHOR', 'ADMIN')")
    public ResponseEntity<?> createCourseResource(
            @PathVariable Long courseId,
            @RequestParam("name") String name,
            @RequestParam("type") String type,
            @RequestParam(value = "isGlobal", required = false, defaultValue = "false") boolean isGlobal,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "ccFile", required = false) MultipartFile ccFile,
            @RequestParam(value = "url", required = false) String url) {
        
        return courseRepository.findById(courseId).map(course -> {
            try {
                MediaResource resource = new MediaResource();
                resource.setName(name);
                resource.setType(type);
                resource.setGlobal(isGlobal);
                resource.setCourse(course);
                
                if (file != null && !file.isEmpty()) {
                    // We save the file to "uploads/" and serve it at "/uploads/filename"
                    // In the DB we store "/uploads/filename"
                    String savedUrl = saveFile(file);
                    // The WebConfig serves /uploads/** from file:uploads/
                    // To avoid API prefix, we store it as "/uploads/..."
                    resource.setUrl(savedUrl.replace("/api", ""));
                } else if (url != null && !url.isEmpty()) {
                    resource.setUrl(url);
                } else {
                    return ResponseEntity.badRequest().body(Map.of("error", "File or URL is required"));
                }

                if (ccFile != null && !ccFile.isEmpty()) {
                    resource.setCcUrl(saveFile(ccFile).replace("/api", ""));
                }

                return ResponseEntity.status(HttpStatus.CREATED).body(resourceRepository.save(resource));
            } catch (IOException e) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    /** GET /api/resources/global */
    @GetMapping("/resources/global")
    public ResponseEntity<List<MediaResource>> getGlobalResources() {
        return ResponseEntity.ok(resourceRepository.findByIsGlobalTrue());
    }

    /** POST /api/resources/global */
    @PostMapping(value = "/resources/global", consumes = "multipart/form-data")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createGlobalResource(
            @RequestParam("name") String name,
            @RequestParam("type") String type,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "ccFile", required = false) MultipartFile ccFile,
            @RequestParam(value = "url", required = false) String url) {
        try {
            MediaResource resource = new MediaResource();
            resource.setName(name);
            resource.setType(type);
            resource.setGlobal(true);
            resource.setCourse(null);

            if (file != null && !file.isEmpty()) {
                resource.setUrl(saveFile(file).replace("/api", ""));
            } else if (url != null && !url.isEmpty()) {
                resource.setUrl(url);
            } else {
                return ResponseEntity.badRequest().body(Map.of("error", "File or URL is required"));
            }

            if (ccFile != null && !ccFile.isEmpty()) {
                resource.setCcUrl(saveFile(ccFile).replace("/api", ""));
            }

            return ResponseEntity.status(HttpStatus.CREATED).body(resourceRepository.save(resource));
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /** PUT /api/resources/{id} - Update/Replace Resource */
    @PutMapping(value = "/resources/{id}", consumes = "multipart/form-data")
    @PreAuthorize("hasAnyRole('AUTHOR', 'ADMIN')")
    public ResponseEntity<?> updateResource(
            @PathVariable Long id,
            @RequestParam("name") String name,
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "ccFile", required = false) MultipartFile ccFile) {
        
        return resourceRepository.findById(id).map(resource -> {
            try {
                resource.setName(name);
                
                // Replace File
                if (file != null && !file.isEmpty()) {
                    String oldUrl = resource.getUrl();
                    String newUrl = saveFile(file).replace("/api", "");
                    resource.setUrl(newUrl);
                    lifecycleService.propagateResourceUrlUpdate(oldUrl, newUrl);
                }

                // Replace/Add CC
                if (ccFile != null && !ccFile.isEmpty()) {
                    String newCcUrl = saveFile(ccFile).replace("/api", "");
                    resource.setCcUrl(newCcUrl);
                }

                return ResponseEntity.ok(resourceRepository.save(resource));
            } catch (IOException e) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    /** DELETE /api/resources/{id} */
    @DeleteMapping("/resources/{id}")
    @PreAuthorize("hasAnyRole('AUTHOR', 'ADMIN')")
    public ResponseEntity<?> deleteResource(@PathVariable Long id) {
        resourceRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Resource deleted"));
    }
}
