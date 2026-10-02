package com.example.finance_app.service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.example.finance_app.config.DefaultCategoryInitializer;
import com.example.finance_app.dto.request.TransactionRequest;
import com.example.finance_app.dto.request.TransactionSearchRequest;
import com.example.finance_app.dto.response.TransactionListResponse;
import com.example.finance_app.dto.response.TransactionPageResponse;
import com.example.finance_app.entity.Categories;
import com.example.finance_app.entity.Transaction;
import com.example.finance_app.entity.Users;
import com.example.finance_app.repository.CategoriesRepository;
import com.example.finance_app.repository.TransactionRepository;
import com.example.finance_app.repository.UsersRepository;

import jakarta.transaction.Transactional;

@Service
public class TransactionService {

    @Autowired
    private UsersRepository usersRepository;
    @Autowired
    private TransactionRepository transactionRepository;
    @Autowired
    private CategoriesRepository categoriesRepository;

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

        // ใช้วันที่ที่ผู้ใช้เลือก (บันทึกย้อนหลังได้) ถ้าไม่ส่งมาให้ใช้เวลาปัจจุบัน
        LocalDateTime txnDate = request.getTransactionDate() != null ? request.getTransactionDate()
                : LocalDateTime.now();
        transaction.setTransactionDate(txnDate);

        // สร้าง id แบบ 14 หลัก: ประเภท(1) + DDMMYY(6) + สุ่ม(7)
        transaction.setId(generateUniqueTransactionId(category.getType(), txnDate));

        return transactionRepository.save(transaction);
    }

    // สร้างรายจ่ายค่างวดอัตโนมัติตอนกดจ่ายงวดผ่อน — ลงวันที่ที่กดจ่ายจริง
    public Transaction createInstallmentPayment(Long userId, Long installmentsId, int period,
            BigDecimal amount, String description) {

        Users user = usersRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("ไม่พบผู้ใช้ดังกล่าว"));

        Categories category = categoriesRepository
                .findActiveByNameAndType(DefaultCategoryInitializer.INSTALLMENT_CATEGORY_NAME, "EXPENSE")
                .orElseThrow(() -> new RuntimeException("ไม่พบหมวดหมู่ค่างวด-ผ่อนชำระ"));

        LocalDateTime now = LocalDateTime.now();
        Transaction transaction = new Transaction();
        transaction.setId(generateUniqueTransactionId(category.getType(), now));
        transaction.setUserId(user);
        transaction.setCategoryId(category);
        transaction.setAmount(amount);
        transaction.setDescription(description);
        transaction.setTransactionDate(now);
        transaction.setInstallmentsId(installmentsId);
        transaction.setInstallmentPeriod(period);

        return transactionRepository.save(transaction);
    }

    // ยกเลิกรายจ่ายค่างวดของงวดที่ระบุ (soft delete)
    public void cancelInstallmentPayments(Long installmentsId, List<Integer> periods) {
        if (periods.isEmpty()) {
            return;
        }
        transactionRepository.softDeleteInstallmentPayments(installmentsId, periods);
    }

    // id = [ประเภท 1 หลัก][DDMMYY 6 หลัก][สุ่ม 7 หลัก] เช่น 2 140926 1234567
    // ประเภท: INCOME=1, EXPENSE=2
    private Long generateUniqueTransactionId(String categoryType, LocalDateTime date) {
        long typeDigit = "INCOME".equalsIgnoreCase(categoryType) ? 1L : 2L;
        long ddmmyy = date.getDayOfMonth() * 10000L
                + date.getMonthValue() * 100L
                + (date.getYear() % 100);
        long prefix = typeDigit * 10_000_000_000_000L + ddmmyy * 10_000_000L;

        Long newId;
        do {
            long random = ThreadLocalRandom.current().nextLong(0L, 10_000_000L); // 0..9,999,999
            newId = prefix + random;
        } while (transactionRepository.existsById(newId));
        return newId;
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
        // ไม่เขียนทับ transactionDate เดิม (การแก้ไขไม่ควรเปลี่ยนวันที่ของรายการ)

        if (updateData.getCategoryId() != null) {
            existingTransaction.setCategoryId(updateData.getCategoryId());
        }

        return transactionRepository.save(existingTransaction);
    }

    // Get list Transaction
    public List<TransactionListResponse> getListTransaction(Long userId) {

        List<Transaction> transactions = transactionRepository.findAllActiveTransactionsByUserId(userId);

        return transactions.stream()
                .map(this::toListResponse)
                .collect(Collectors.toList());
    }

    // แปลง Transaction entity -> DTO (ใช้ร่วมกันหลายที่)
    private TransactionListResponse toListResponse(Transaction t) {
        TransactionListResponse response = new TransactionListResponse();
        response.setId(t.getId());
        response.setAmount(t.getAmount());
        response.setDescription(t.getDescription());
        response.setTransactionDate(t.getTransactionDate());

        if (t.getCategoryId() != null) {
            response.setCategoryId(t.getCategoryId().getId());
            response.setCategoryName(t.getCategoryId().getName());
            response.setCategoryType(t.getCategoryId().getType());
            response.setCategoryIcon(t.getCategoryId().getIcon());
        }
        return response;
    }

    // ค้นหา/กรอง/เรียง/แบ่งหน้า + ยอดสรุปของทั้งชุดที่ตรงเงื่อนไข
    public TransactionPageResponse searchTransactions(TransactionSearchRequest req) {

        if (req.getUserId() == null) {
            throw new RuntimeException("ไม่พบผู้ใช้");
        }

        // แบ่งหน้า: frontend เริ่มนับที่ 1 -> Spring เริ่มที่ 0
        int page = (req.getPage() != null && req.getPage() > 0) ? req.getPage() - 1 : 0;
        int size = (req.getSize() != null && req.getSize() > 0) ? req.getSize() : 10;

        // เรียงลำดับ — จำกัดเฉพาะฟิลด์ที่อนุญาต กัน injection ผ่านชื่อฟิลด์
        String sortBy = "amount".equalsIgnoreCase(req.getSortBy()) ? "amount" : "transactionDate";
        Sort.Direction dir = "asc".equalsIgnoreCase(req.getSortDir())
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(dir, sortBy));

        // ปรับพารามิเตอร์ให้เป็น null เมื่อไม่ต้องการกรอง
        String search = (req.getSearch() != null && !req.getSearch().isBlank())
                ? req.getSearch().trim()
                : null;
        String type = (req.getType() != null && !req.getType().isBlank() && !"ALL".equalsIgnoreCase(req.getType()))
                ? req.getType()
                : null;
        Long categoryId = req.getCategoryId();
        LocalDateTime dateFrom = req.getDateFrom() != null ? req.getDateFrom().atStartOfDay() : null;
        LocalDateTime dateTo = req.getDateTo() != null ? req.getDateTo().atTime(LocalTime.MAX) : null;

        Page<Transaction> result = transactionRepository.searchTransactions(
                req.getUserId(), search, type, categoryId, dateFrom, dateTo, pageable);

        List<TransactionListResponse> content = result.getContent().stream()
                .map(this::toListResponse)
                .collect(Collectors.toList());

        // ยอดสรุปแยกตามประเภท (คิดจากทั้งชุดที่ตรงเงื่อนไข ไม่ใช่แค่หน้านี้)
        BigDecimal totalIncome = BigDecimal.ZERO;
        BigDecimal totalExpense = BigDecimal.ZERO;
        for (Object[] row : transactionRepository.sumByType(
                req.getUserId(), search, type, categoryId, dateFrom, dateTo)) {
            String catType = (String) row[0];
            BigDecimal sum = (row[1] != null) ? new BigDecimal(row[1].toString()) : BigDecimal.ZERO;
            if ("INCOME".equalsIgnoreCase(catType)) {
                totalIncome = totalIncome.add(sum);
            } else if ("EXPENSE".equalsIgnoreCase(catType)) {
                totalExpense = totalExpense.add(sum);
            }
        }

        return new TransactionPageResponse(
                content,
                result.getNumber() + 1, // กลับเป็น 1-based ให้ frontend
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages(),
                totalIncome,
                totalExpense);
    }

    // ลบหลายรายการพร้อมกัน (soft delete)
    @Transactional
    public int bulkDeleteTransactions(List<Long> ids, Long userId) {
        if (userId == null) {
            throw new RuntimeException("ไม่พบผู้ใช้");
        }
        if (ids == null || ids.isEmpty()) {
            throw new RuntimeException("ไม่พบรายการที่จะลบ");
        }
        return transactionRepository.softDeleteByIds(ids, userId);
    }
}
