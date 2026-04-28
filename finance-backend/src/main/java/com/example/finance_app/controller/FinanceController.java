package com.example.finance_app.controller;

import com.example.finance_app.repository.CategoriesRepository;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.finance_app.dto.request.CategoriesRequest;
import com.example.finance_app.dto.request.LoginRequest;
import com.example.finance_app.dto.request.RegisterRequest;
import com.example.finance_app.dto.request.TransactionRequest;
import com.example.finance_app.dto.response.TransactionListResponse;
import com.example.finance_app.entity.Categories;
import com.example.finance_app.entity.Transaction;
import com.example.finance_app.service.FinanceService;

@RestController
@RequestMapping("finance-app")
@CrossOrigin(origins = "*")
public class FinanceController {

    private final CategoriesRepository categoriesRepository;

    @Autowired
    private FinanceService financeService;

    FinanceController(CategoriesRepository categoriesRepository) {
        this.categoriesRepository = categoriesRepository;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest req) {
        try {
            return ResponseEntity.ok(financeService.registerUser(req));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        try {
            return ResponseEntity.ok(financeService.login(req));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(e.getMessage());
        }
    }

    // ========================== Transaction Controller =======================

    @PostMapping("/add/transaction")
    public ResponseEntity<Transaction> createTransaction(@RequestBody TransactionRequest req) {
        try {
            return ResponseEntity.ok(financeService.createTransaction(req));
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.BAD_REQUEST);
        }
    }

    // Delete Transaction
    @PostMapping("/transactions/delete/{id}")
    public ResponseEntity<String> deleteTransaction(@PathVariable Long id) {
        try {
            financeService.deleteTrasaction(id);
            return ResponseEntity.ok("ลบรายการ (Soft Delete) เรียบร้อยแล้ว");
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    // Update Transaction
    @PostMapping("/transaction/update")
    public ResponseEntity<?> updateTransaction(@RequestBody Transaction updateData) {
        try {
            Transaction result = financeService.updateTransaction(updateData.getId(), updateData);

            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ");
        }
    }

    // Get list Transaction
    @PostMapping("/transactions/list")
    public ResponseEntity<?> getTransactionList(@RequestBody Map<String, Long> payload) {
        try {
            Long userId = payload.get("userId");
            List<TransactionListResponse> result = financeService.getListTransaction(userId);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    // ===================== Categories Controller =====================

    @GetMapping
    public ResponseEntity<List<Categories>> getAllMyCategories() {
        return ResponseEntity.ok(financeService.getMyCategories());
    }

    @PostMapping("/add/categories")
    public ResponseEntity<Categories> createCategoriesById(@RequestBody CategoriesRequest request) {
        return ResponseEntity.ok(financeService.createdCategoriesByUserId(request));
    }

    @PostMapping("/categories/delete")
    public ResponseEntity<String> deleteCategories(@RequestBody Map<String, Long> payload) {
        try {
            Long id = payload.get("id");

            financeService.deleteCategories(id);
            return ResponseEntity.ok("ลบหมวดหมู่เรียบร้อยแล้ว");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

}
