package com.example.finance_app.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.finance_app.dto.request.CategoriesRequest;
import com.example.finance_app.dto.request.LoginRequest;
import com.example.finance_app.dto.request.RegisterRequest;
import com.example.finance_app.dto.request.TransactionRequest;
import com.example.finance_app.dto.response.AuthResponse;
import com.example.finance_app.dto.response.TransactionListResponse;
import com.example.finance_app.entity.Categories;
import com.example.finance_app.entity.Transaction;
import com.example.finance_app.entity.Users;
import com.example.finance_app.repository.CategoriesRepository;
import com.example.finance_app.repository.TransactionRepository;
import com.example.finance_app.repository.UsersRepository;

import jakarta.transaction.Transactional;

@Service
public class FinanceService {

    @Autowired
    private UsersRepository usersRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private CategoriesRepository categoriesRepository;

    // ====================== Register Service ======================
    @Transactional
    public AuthResponse registerUser(RegisterRequest request) {

        if (usersRepository.existsByUsername(request.getUsername()) > 0) {
            throw new RuntimeException("Username นี้ถูกใช้งานแล้ว");
        }

        Users user = new Users();

        user.setUsername(request.getUsername());
        user.setPassword(request.getPassword());
        user.setEmail(request.getEmail());
        user.setCreatedAt(LocalDateTime.now());

        Users savedUser = usersRepository.save(user);

        AuthResponse response = new AuthResponse();
        response.setId(savedUser.getId());
        response.setUsername(savedUser.getUsername());
        response.setEmail(savedUser.getEmail());
        response.setMessage("ลงทะเบียนสำเร็จ");

        return response;

    }

    // ====================== Login Service ======================
    @Transactional
    public AuthResponse login(LoginRequest req) {

        Users user = usersRepository.findByUsername(req.getUsername());

        if (user != null && user.getPassword().equals(req.getPassword())) {

            AuthResponse res = new AuthResponse();
            res.setId(user.getId());
            res.setUsername(user.getUsername());
            res.setMessage("เข้าสู่ระบบสำเร็จ");
            return res;
        }

        throw new RuntimeException("Username หรือ Password ไม่ถูกต้อง");
    }

    // ====================== Transaction Service ======================

    public List<Transaction> getActiveTransactions() {
        Long currentUserId = 1L;
        return transactionRepository.findActiveByUserId(currentUserId);
    }

    // Create Transaction
    public Transaction createTransaction(TransactionRequest request) {

        Users user = usersRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("ไม่พบผู้ใช้ดังกล่าว"));

        Categories category = categoriesRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new RuntimeException("ไม่พบหมวดหมู่ดังกล่าว"));

        Transaction transaction = new Transaction();

        transaction.setCategoryId(category);
        transaction.setUserId(user);

        transaction.setAmount(request.getAmount());
        transaction.setDescription(request.getDescription());

        transaction.setTransactionDate(LocalDateTime.now());

        return transactionRepository.save(transaction);
    }

    // Delete Transaction
    @Transactional
    public void deleteTrasaction(Long id) {

        Long currentUserId = 1L;

        int result = transactionRepository.deleteTransactionById(id, currentUserId);

        if (result == 0) {
            throw new RuntimeException("ไม่สามารถดำเนินการได้: หาไม่พบ หรือไม่มีสิทธิ์");
        }

        // NOTE: ลบรายการแล้ว Count ยอดเงินใหม่
    }

    // Update Transaction
    @Transactional
    public Transaction updateTransaction(Long id, Transaction updateData) {

        Transaction existingTransaction = transactionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("ไม่พบรายการธุรกรรมดังกล่าว"));

        if (existingTransaction.isDeleted()) {
            throw new RuntimeException("ไม่สามารถแก้ไขรายการที่ลบไปแล้ว");
        }

        existingTransaction.setUserId(updateData.getUserId());
        existingTransaction.setAmount(updateData.getAmount());
        existingTransaction.setDescription(updateData.getDescription());
        existingTransaction.setTransactionDate(LocalDateTime.now());

        if (updateData.getCategoryId() != null) {
            existingTransaction.setCategoryId(updateData.getCategoryId());
        }

        return transactionRepository.save(existingTransaction);
    }

    // Get list Transaction
    public List<TransactionListResponse> getListTransaction(Long userId) {

        List<Transaction> transactions = transactionRepository.findAllActiveTransactionsByUserId(userId);

        return transactions.stream().map(t -> {
            TransactionListResponse response = new TransactionListResponse();
            response.setId(t.getId());
            response.setAmount(t.getAmount());
            response.setDescription(t.getDescription());
            response.setTransactionDate(t.getTransactionDate());

            if (t.getCategoryId() != null) {
                response.setCategoryId(t.getCategoryId().getId());
                response.setCategoryName(t.getCategoryId().getName());
                response.setCategoryType(t.getCategoryId().getType());
            }
            return response;
        }).collect(Collectors.toList());
    }

    // ======================= Categories Service =======================

    public List<Categories> getMyCategories() {
        Long currentUserId = 1L;
        return categoriesRepository.findByUserId(currentUserId);
    }

    @Transactional
    public Categories createdCategoriesByUserId(CategoriesRequest request) {

        Long currentUserId = 1L;

        Users users = usersRepository.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("ไม่พบผู้ใช้ดังกล่าว"));

        Categories categories = new Categories();

        categories.setUser(users);
        categories.setName(request.getName());
        categories.setType(request.getType());
        categories.setIcon(request.getIcon());

        return categoriesRepository.save(categories);
    }

    @Transactional
    public void deleteCategories(Long id) {

        Categories categories = categoriesRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("ไม่พบหมวดหมู่ดังกล่าว ID: " + id));

        categories.setDeleted(true);
        categoriesRepository.save(categories);
    }

}
