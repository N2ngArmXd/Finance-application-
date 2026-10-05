package com.example.finance_app.controller;

import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.finance_app.dto.request.LoginRequest;
import com.example.finance_app.dto.request.RegisterRequest;
import com.example.finance_app.dto.response.AuthResponse;
import com.example.finance_app.security.CurrentUser;
import com.example.finance_app.security.JwtService;
import com.example.finance_app.service.AuthService;
import com.example.finance_app.service.InputValidationException;

@RestController
@RequestMapping("/finance-app")
@CrossOrigin(origins = "*")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private AuthService authService;

    @Autowired
    private JwtService jwtService;

    // login ผ่าน → ส่ง JWT กลับเป็น httpOnly cookie (JS อ่านไม่ได้) + ข้อมูลผู้ใช้ใน body
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        AuthResponse user;
        try {
            user = authService.login(req);
        } catch (IllegalStateException e) {
            // ถอดรหัสไม่ได้ (key ไม่ตรง / ข้อมูลเสีย) — ไม่บอกรายละเอียด client
            log.error("Login failed", e);
            return ResponseEntity.status(401).body("Username หรือ Password ไม่ถูกต้อง");
        } catch (Exception e) {
            return ResponseEntity.status(401).body("Username หรือ Password ไม่ถูกต้อง");
        }
        String token = jwtService.issue(user.getId());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, jwtService.loginCookie(token).toString())
                .body(user);
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, jwtService.logoutCookie().toString())
                .body(Map.of("message", "ออกจากระบบแล้ว"));
    }

    // เช็คว่า cookie ยังใช้ได้ (เรียกตอนเปิดแอป) — ถ้าหมดอายุ interceptor ตอบ 401 ให้เอง
    @PostMapping("/me")
    public ResponseEntity<?> me(@CurrentUser Long userId) {
        return ResponseEntity.ok(authService.currentUser(userId));
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
