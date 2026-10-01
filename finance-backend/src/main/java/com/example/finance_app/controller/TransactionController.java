package com.example.finance_app.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.finance_app.dto.request.BulkDeleteRequest;
import com.example.finance_app.dto.request.TransactionRequest;
import com.example.finance_app.dto.request.TransactionSearchRequest;
import com.example.finance_app.dto.response.TransactionListResponse;
import com.example.finance_app.entity.Transaction;
import com.example.finance_app.service.TransactionService;

@RestController
@RequestMapping("/finance-app")
@CrossOrigin(origins = "*")
public class TransactionController {

    @Autowired
    private TransactionService transactionService;

    @PostMapping("/add/transaction")
    public ResponseEntity<Transaction> createTransaction(@RequestBody TransactionRequest req) {
        try {
            return ResponseEntity.ok(transactionService.createTransaction(req));
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.BAD_REQUEST);
        }
    }

    // Delete Transaction
    @PostMapping("/transactions/delete/{id}")
    public ResponseEntity<String> deleteTransaction(@PathVariable Long id) {
        try {
            transactionService.deleteTrasaction(id);
            return ResponseEntity.ok("ลบรายการ (Soft Delete) เรียบร้อยแล้ว");
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    // Update Transaction
    @PostMapping("/transaction/update")
    public ResponseEntity<?> updateTransaction(@RequestBody Transaction updateData) {
        try {
            Transaction result = transactionService.updateTransaction(updateData.getId(), updateData);

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
            List<TransactionListResponse> result = transactionService.getListTransaction(userId);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    // Search + filter + sort + pagination (หน้าประวัติธุรกรรม)
    @PostMapping("/transactions/search")
    public ResponseEntity<?> searchTransactions(@RequestBody TransactionSearchRequest req) {
        try {
            return ResponseEntity.ok(transactionService.searchTransactions(req));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    // ลบหลายรายการพร้อมกัน (soft delete)
    @PostMapping("/transactions/delete-batch")
    public ResponseEntity<String> deleteTransactionsBatch(@RequestBody BulkDeleteRequest req) {
        try {
            int deleted = transactionService.bulkDeleteTransactions(req.getIds(), req.getUserId());
            return ResponseEntity.ok("ลบ " + deleted + " รายการเรียบร้อยแล้ว");
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }
}
