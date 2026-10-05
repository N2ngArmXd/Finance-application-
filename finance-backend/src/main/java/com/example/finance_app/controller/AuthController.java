package com.example.finance_app.controller;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.finance_app.dto.request.LoginRequest;
import com.example.finance_app.dto.request.RegisterRequest;
import com.example.finance_app.service.AuthService;
import com.example.finance_app.service.InputValidationException;

@RestController
@RequestMapping("/finance-app")
@CrossOrigin(origins = "*")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

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
    // ตอบ error เป็น { message, errors: { field: ข้อความ } } ให้หน้าบ้านแสดงใต้ช่องที่ผิด

    // ตรวจข้อมูลหน้าบัญชี (username/password/email) ก่อนไปหน้าถัดไป — ไม่บันทึก
    @PostMapping("/register/check")
    public ResponseEntity<?> checkAccount(@RequestBody RegisterRequest request) {
        try {
            authService.checkAccount(request);
            return ResponseEntity.ok(Map.of("message", "ok"));
        } catch (InputValidationException e) {
            return validationError(e);
        }
    }

    // ตรวจข้อมูลครบทุกช่อง + ข้อมูลซ้ำ ก่อนหน้าบ้านเปิด popup ยืนยัน — ไม่บันทึก
    @PostMapping("/register/validate")
    public ResponseEntity<?> validateRegistration(@RequestBody RegisterRequest request) {
        try {
            authService.validateRegistration(request);
            return ResponseEntity.ok(Map.of("message", "ok"));
        } catch (InputValidationException e) {
            return validationError(e);
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        try {
            authService.register(request);
            return ResponseEntity.ok(Map.of("message", "สมัครสมาชิกสำเร็จ"));
        } catch (InputValidationException e) {
            return validationError(e);
        } catch (Exception e) {
            // ไม่ส่งรายละเอียด exception ให้ client — log ไว้ฝั่ง server แทน
            log.error("Register failed", e);
            return ResponseEntity.internalServerError().body(Map.of("message", "ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง"));
        }
    }

    private ResponseEntity<?> validationError(InputValidationException e) {
        return ResponseEntity.badRequest().body(Map.of("message", e.getMessage(), "errors", e.getErrors()));
    }
}
