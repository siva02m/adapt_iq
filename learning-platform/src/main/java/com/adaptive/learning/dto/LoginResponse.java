package com.adaptive.learning.dto;

public class LoginResponse {
    private String token;
    private String email;
    private String fullName;
    private String role;
    private Long userId;

    public LoginResponse(String token, String email, String fullName, String role, Long userId) {
        this.token = token;
        this.email = email;
        this.fullName = fullName;
        this.role = role;
        this.userId = userId;
    }

    public String getToken() { return token; }
    public String getEmail() { return email; }
    public String getFullName() { return fullName; }
    public String getRole() { return role; }
    public Long getUserId() { return userId; }
}
