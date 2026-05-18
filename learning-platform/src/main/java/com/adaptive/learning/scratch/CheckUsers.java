package com.adaptive.learning.scratch;

import com.adaptive.learning.repositories.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class CheckUsers implements CommandLineRunner {
    private final UserRepository userRepository;

    public CheckUsers(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public void run(String... args) {
        System.out.println("--- CHECKING USERS ---");
        userRepository.findAll().forEach(u -> {
            System.out.println("User: " + u.getEmail() + " | Role: " + u.getRole());
        });
        System.out.println("Total users: " + userRepository.count());
    }
}
