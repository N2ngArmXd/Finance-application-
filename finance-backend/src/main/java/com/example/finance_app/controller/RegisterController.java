package com.example.finance_app.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.finance_app.dto.request.RegisterRequest;
import com.example.finance_app.service.RegisterService;

@RestController
@RequestMapping("/finance-app/register")
@CrossOrigin("*")
public class RegisterController {

    @Autowired
    private RegisterService registerService;

    // Step 1
    @PostMapping("/step1")
    public ResponseEntity<Long> registerStep1(@RequestBody RegisterRequest request) {
        try {
            Long userId = registerService.registerStep1(request);
            return ResponseEntity.ok(userId);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // Step 2
    @PostMapping("/step2/{userId}")
    public ResponseEntity<String> registerStep2(
            @PathVariable Long userId,
            @RequestBody RegisterRequest request) {
        try {
            registerService.registerStep2(userId, request);
            return ResponseEntity.ok("Step 2 completed successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/step3/{userId}")
    public ResponseEntity<String> registerStep3(
            @PathVariable Long userId,
            @RequestBody RegisterRequest request) {
        try {
            registerService.registerStep3(userId, request);
            return ResponseEntity.ok("Registration completed successfully");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
