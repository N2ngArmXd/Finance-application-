package com.example.finance_app.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.finance_app.dto.request.LoginRequest;
import com.example.finance_app.dto.request.RegisterRequest;
import com.example.finance_app.service.AuthService;

@RestController
@RequestMapping("/finance-app")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        try {
            return ResponseEntity.ok(authService.login(req));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(e.getMessage());
        }
    }

    // ===================== Register =====================

    // Step 1
    @PostMapping("/register/step1")
    public ResponseEntity<Long> registerStep1(@RequestBody RegisterRequest request) {
        try {
            Long userId = authService.registerStep1(request);
            return ResponseEntity.ok(userId);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // Step 2
    @PostMapping("/register/step2/{userId}")
    public ResponseEntity<String> registerStep2(
            @PathVariable Long userId,
            @RequestBody RegisterRequest request) {
        try {
            authService.registerStep2(userId, request);
            return ResponseEntity.ok("Step 2 completed successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // Step 3
    @PostMapping("/register/step3/{userId}")
    public ResponseEntity<String> registerStep3(
            @PathVariable Long userId,
            @RequestBody RegisterRequest request) {
        try {
            authService.registerStep3(userId, request);
            return ResponseEntity.ok("Registration completed successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
