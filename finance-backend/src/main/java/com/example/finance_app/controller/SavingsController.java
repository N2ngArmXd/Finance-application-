package com.example.finance_app.controller;

import java.util.function.Supplier;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.finance_app.dto.request.SavingsGoalRequest;
import com.example.finance_app.dto.request.SavingsMovementRequest;
import com.example.finance_app.security.CurrentUser;
import com.example.finance_app.service.SavingsService;

// เงินออม (กระปุก + ฝาก/ถอน) — error ทางธุรกิจตอบ 400 พร้อมข้อความภาษาไทย
@RestController
@RequestMapping("/finance-app")
@CrossOrigin(origins = "*")
public class SavingsController {

    @Autowired
    private SavingsService savingsService;

    @PostMapping("/savings/list")
    public ResponseEntity<?> listGoals(@CurrentUser Long userId) {
        return handle(() -> savingsService.listGoals(userId));
    }

    @PostMapping("/savings/create")
    public ResponseEntity<?> createGoal(@RequestBody SavingsGoalRequest req, @CurrentUser Long userId) {
        req.setUserId(userId);
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(savingsService.createGoal(req));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PostMapping("/savings/update")
    public ResponseEntity<?> updateGoal(@RequestBody SavingsGoalRequest req, @CurrentUser Long userId) {
        req.setUserId(userId);
        return handle(() -> savingsService.updateGoal(req));
    }

    // ปิดกระปุก (withdrawAll = true -> ถอนที่เหลือกลับเข้ากระเป๋าก่อนปิด)
    @PostMapping("/savings/archive")
    public ResponseEntity<?> archiveGoal(@RequestBody SavingsGoalRequest req, @CurrentUser Long userId) {
        req.setUserId(userId);
        return handle(() -> savingsService.archiveGoal(req));
    }

    @PostMapping("/savings/reopen")
    public ResponseEntity<?> reopenGoal(@RequestBody SavingsGoalRequest req, @CurrentUser Long userId) {
        req.setUserId(userId);
        return handle(() -> savingsService.reopenGoal(req));
    }

    @PostMapping("/savings/delete")
    public ResponseEntity<?> deleteGoal(@RequestBody SavingsGoalRequest req, @CurrentUser Long userId) {
        req.setUserId(userId);
        return handle(() -> {
            savingsService.deleteGoal(req);
            return "ลบกระปุกเรียบร้อยแล้ว";
        });
    }

    @PostMapping("/savings/movements")
    public ResponseEntity<?> listMovements(@RequestBody SavingsMovementRequest req, @CurrentUser Long userId) {
        req.setUserId(userId);
        return handle(() -> savingsService.listMovements(req));
    }

    @PostMapping("/savings/deposit")
    public ResponseEntity<?> deposit(@RequestBody SavingsMovementRequest req, @CurrentUser Long userId) {
        req.setUserId(userId);
        return handle(() -> savingsService.deposit(req));
    }

    // mode: TO_WALLET (กลับเข้ากระเป๋า) | SPEND (+ categoryId -> สร้างรายจ่าย)
    @PostMapping("/savings/withdraw")
    public ResponseEntity<?> withdraw(@RequestBody SavingsMovementRequest req, @CurrentUser Long userId) {
        req.setUserId(userId);
        return handle(() -> savingsService.withdraw(req));
    }

    @PostMapping("/savings/movement/update")
    public ResponseEntity<?> updateMovement(@RequestBody SavingsMovementRequest req, @CurrentUser Long userId) {
        req.setUserId(userId);
        return handle(() -> savingsService.updateMovement(req));
    }

    @PostMapping("/savings/movement/delete")
    public ResponseEntity<?> deleteMovement(@RequestBody SavingsMovementRequest req, @CurrentUser Long userId) {
        req.setUserId(userId);
        return handle(() -> {
            savingsService.deleteMovement(req);
            return "ลบรายการเรียบร้อยแล้ว";
        });
    }

    private ResponseEntity<?> handle(Supplier<Object> action) {
        try {
            return ResponseEntity.ok(action.get());
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }
}
