package com.adaptive.learning.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "media_resources")
public class MediaResource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, length = 1000)
    private String url;

    @Column(nullable = false, length = 50)
    private String type; // e.g., 'VIDEO', 'AUDIO', 'DOCUMENT', 'IMAGE'

    // If true, the resource is available in the global library, even if it belongs to a course
    @Column(name = "is_global")
    private boolean isGlobal = false;

    @Column(name = "cc_url", length = 1000)
    private String ccUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id")
    private Course course;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public Course getCourse() { return course; }
    public void setCourse(Course course) { this.course = course; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public boolean isGlobal() { return isGlobal; }
    public void setGlobal(boolean global) { isGlobal = global; }

    public String getCcUrl() { return ccUrl; }
    public void setCcUrl(String ccUrl) { this.ccUrl = ccUrl; }
}
