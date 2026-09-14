package com.example.finance_app.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.finance_app.dto.request.CategoriesRequest;
import com.example.finance_app.dto.request.InstallmentsRequest;
import com.example.finance_app.dto.request.LoginRequest;
import com.example.finance_app.dto.request.RegisterRequest;
import com.example.finance_app.dto.request.TransactionRequest;
import com.example.finance_app.dto.response.AuthResponse;
import com.example.finance_app.dto.response.TransactionListResponse;
import com.example.finance_app.entity.Categories;
import com.example.finance_app.entity.InstallmentsEntity;
import com.example.finance_app.entity.Transaction;
import com.example.finance_app.entity.Users;
import com.example.finance_app.repository.CategoriesRepository;
import com.example.finance_app.repository.InstallmentsRepository;
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
    @Autowired
    private InstallmentsRepository installmentsRepository;

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
        Users user = usersRepository.findAll().stream().findFirst()
                .orElseThrow(() -> new RuntimeException("ไม่พบผู้ใช้ในระบบ"));
        return transactionRepository.findActiveByUserId(user.getId());
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

        Users user = usersRepository.findAll().stream().findFirst()
                .orElseThrow(() -> new RuntimeException("ไม่พบผู้ใช้ในระบบ"));

        int result = transactionRepository.deleteTransactionById(id, user.getId());

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
        // หา User คนแรกจากฐานข้อมูล
        Users users = usersRepository.findAll().stream().findFirst()
                .orElseThrow(() -> new RuntimeException("ไม่พบผู้ใช้ในระบบ"));

        return categoriesRepository.findByUserId(users.getId());
    }

    @Transactional
    public Categories createdCategoriesByUserId(CategoriesRequest request) {

        // หา User คนแรกจากฐานข้อมูล
        Users users = usersRepository.findAll().stream().findFirst()
                .orElseThrow(() -> new RuntimeException("ไม่พบผู้ใช้ในระบบ"));

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

    // ======================= Installsments Service =======================

    @Transactional
    public InstallmentsEntity createdInstallments(InstallmentsRequest request) {

        if (request.getTotalAmount() == null || request.getTotalAmount().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("ยอดรวมต้องมากกว่า 0 บาทนะจ๊ะน้อง");
        }
        if (request.getInstallmentMonths() == null || request.getInstallmentMonths() <= 0) {
            throw new IllegalArgumentException("จำนวนเดือนต้องมากกว่า 0 เดือนนะจ๊ะ");
        }

        BigDecimal actualInterestRate = (request.getInterestRate() != null)
                ? request.getInterestRate()
                : BigDecimal.ZERO;

        String type = (request.getInterestType() != null) ? request.getInterestType().toUpperCase() : "YEARLY";

        BigDecimal finalMonthlyAmount = request.getMonthlyAmount();

        // Interest Rate 
        if (finalMonthlyAmount == null || finalMonthlyAmount.compareTo(BigDecimal.ZERO) <= 0) {

            BigDecimal principalPerMonth = request.getTotalAmount()
                    .divide(new BigDecimal(request.getInstallmentMonths()), 2, RoundingMode.HALF_UP);

            BigDecimal interestPerMonth;

            if ("YEARLY".equals(type)) {
                interestPerMonth = request.getTotalAmount().multiply(actualInterestRate)
                        .divide(new BigDecimal("100"), 10, RoundingMode.HALF_UP)
                        .divide(new BigDecimal("12"), 2, RoundingMode.HALF_UP);
            } else {
                interestPerMonth = request.getTotalAmount().multiply(actualInterestRate)
                        .divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
            }

            finalMonthlyAmount = principalPerMonth.add(interestPerMonth);
        }

        InstallmentsEntity installments = new InstallmentsEntity();

        installments.setUserId(request.getUserId());
        installments.setInstallmentsName(request.getInstallmentsName());
        installments.setDescription(request.getDescription());
        installments.setTotalAmount(request.getTotalAmount());
        installments.setInterestType(type);
        installments.setInterestRate(actualInterestRate);
        installments.setInstallmentMonths(request.getInstallmentMonths());
        installments.setMonthlyAmount(finalMonthlyAmount);
        installments.setStatus("ACTIVE");

        LocalDate startDate = request.getStartDate() != null ? request.getStartDate() : LocalDate.now();
        installments.setStartDate(startDate);

        installments.setCreatedAt(LocalDateTime.now());

        return installmentsRepository.save(installments);

    }

    public List<InstallmentsEntity> getListInstallments(Long userId) {
        return installmentsRepository.findByUserId(userId);
    }

}
