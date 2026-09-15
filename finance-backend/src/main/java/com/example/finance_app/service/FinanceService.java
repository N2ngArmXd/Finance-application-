package com.example.finance_app.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.TreeSet;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.example.finance_app.dto.request.InstallmentsRequest;
import com.example.finance_app.dto.request.LoginRequest;
import com.example.finance_app.dto.request.RegisterRequest;
import com.example.finance_app.dto.request.TransactionRequest;
import com.example.finance_app.dto.request.TransactionSearchRequest;
import com.example.finance_app.dto.response.AuthResponse;
import com.example.finance_app.dto.response.TransactionListResponse;
import com.example.finance_app.dto.response.TransactionPageResponse;
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

        // ใช้วันที่ที่ผู้ใช้เลือก (บันทึกย้อนหลังได้) ถ้าไม่ส่งมาให้ใช้เวลาปัจจุบัน
        LocalDateTime txnDate = request.getTransactionDate() != null ? request.getTransactionDate()
                : LocalDateTime.now();
        transaction.setTransactionDate(txnDate);

        // สร้าง id แบบ 14 หลัก: ประเภท(1) + DDMMYY(6) + สุ่ม(7)
        transaction.setId(generateUniqueTransactionId(category.getType(), txnDate));

        return transactionRepository.save(transaction);
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

    // ======================= Categories Service =======================

    // หมวดหมู่เป็นชุด default กลาง ใช้ร่วมกันทุก user
    public List<Categories> getMyCategories() {
        return categoriesRepository.findAllActiveCategories();
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

        // วิธีคิดดอกเบี้ย: FLAT (คงที่) หรือ EFFECTIVE (ลดต้นลดดอก) ค่าเริ่มต้น FLAT
        String method = (request.getCalculationMethod() != null)
                ? request.getCalculationMethod().toUpperCase()
                : "FLAT";

        BigDecimal finalMonthlyAmount = request.getMonthlyAmount();

        // คำนวณยอดผ่อนต่อเดือนอัตโนมัติ เมื่อไม่ได้ส่ง monthlyAmount มาเอง
        if (finalMonthlyAmount == null || finalMonthlyAmount.compareTo(BigDecimal.ZERO) <= 0) {
            finalMonthlyAmount = computeMonthlyAmount(
                    request.getTotalAmount(), request.getInstallmentMonths(), actualInterestRate, type, method);
        }

        InstallmentsEntity installments = new InstallmentsEntity();

        LocalDate idDate = request.getStartDate() != null ? request.getStartDate() : LocalDate.now();
        installments.setInstallmentsId(generateUniqueInstallmentId(method, idDate));
        installments.setUserId(request.getUserId());
        installments.setInstallmentsName(request.getInstallmentsName());
        installments.setDescription(request.getDescription());
        installments.setTotalAmount(request.getTotalAmount());
        installments.setInterestType(type);
        installments.setCalculationMethod(method);
        installments.setInterestRate(actualInterestRate);
        installments.setInstallmentMonths(request.getInstallmentMonths());
        installments.setMonthlyAmount(finalMonthlyAmount);
        installments.setStatus("ACTIVE");

        LocalDate startDate = request.getStartDate() != null ? request.getStartDate() : LocalDate.now();
        installments.setStartDate(startDate);

        installments.setCreatedAt(LocalDateTime.now());

        return installmentsRepository.save(installments);

    }

    // คำนวณยอดผ่อนต่อเดือน (ใช้ร่วมกันทั้งตอนสร้างและแก้ไข)
    private BigDecimal computeMonthlyAmount(BigDecimal principal, int months, BigDecimal rate,
            String type, String method) {

        // แปลงอัตราดอกเบี้ยให้เป็น "อัตราต่อเดือน" ในรูปทศนิยม (เช่น 15%/ปี -> 0.0125)
        // YEARLY: rate เป็นต่อปี จึงหารด้วย 12 ; MONTHLY: rate เป็นต่อเดือนอยู่แล้ว
        BigDecimal monthlyRate;
        if ("YEARLY".equals(type)) {
            monthlyRate = rate
                    .divide(new BigDecimal("100"), 10, RoundingMode.HALF_UP)
                    .divide(new BigDecimal("12"), 10, RoundingMode.HALF_UP);
        } else {
            monthlyRate = rate
                    .divide(new BigDecimal("100"), 10, RoundingMode.HALF_UP);
        }

        if ("EFFECTIVE".equals(method)) {
            // ลดต้นลดดอก (Effective/Reducing Balance) ใช้สูตรผ่อนคงที่ (Amortization/PMT)
            // PMT = P * r * (1+r)^n / ((1+r)^n - 1) ; ถ้า r = 0 -> P / n
            if (monthlyRate.compareTo(BigDecimal.ZERO) == 0) {
                return principal.divide(new BigDecimal(months), 2, RoundingMode.HALF_UP);
            }
            BigDecimal pow = BigDecimal.ONE.add(monthlyRate).pow(months);
            return principal.multiply(monthlyRate).multiply(pow)
                    .divide(pow.subtract(BigDecimal.ONE), 2, RoundingMode.HALF_UP);
        }

        // ดอกเบี้ยคงที่ (Flat/Fixed Rate): ดอกเบี้ยต่อเดือนคิดจากยอดเต็มทุกงวด
        BigDecimal principalPerMonth = principal
                .divide(new BigDecimal(months), 2, RoundingMode.HALF_UP);
        BigDecimal interestPerMonth = principal.multiply(monthlyRate)
                .setScale(2, RoundingMode.HALF_UP);

        return principalPerMonth.add(interestPerMonth);
    }

    // id = [วิธีคิด 1 หลัก][DDMMYY 6 หลัก][สุ่ม 7 หลัก] เช่น 2 140926 1234567
    // วิธีคิด: FLAT=1, EFFECTIVE=2
    private Long generateUniqueInstallmentId(String method, LocalDate date) {
        long methodDigit = "EFFECTIVE".equalsIgnoreCase(method) ? 2L : 1L;
        long ddmmyy = date.getDayOfMonth() * 10000L
                + date.getMonthValue() * 100L
                + (date.getYear() % 100);
        long prefix = methodDigit * 10_000_000_000_000L + ddmmyy * 10_000_000L;

        Long newId;
        do {
            long random = ThreadLocalRandom.current().nextLong(0L, 10_000_000L); // 0..9,999,999
            newId = prefix + random;
        } while (installmentsRepository.existsById(newId));
        return newId;
    }

    public List<InstallmentsEntity> getListInstallments(Long userId) {
        return installmentsRepository.findByUserIdAndIsDeletedFalse(userId);
    }

    // แก้ไขรายการผ่อน — อัปเดตทุก field แล้วคำนวณ monthlyAmount + สถานะใหม่
    @Transactional
    public InstallmentsEntity updateInstallments(InstallmentsRequest request) {

        if (request.getInstallmentsId() == null) {
            throw new IllegalArgumentException("ไม่พบรหัสรายการที่จะแก้ไข");
        }

        InstallmentsEntity item = installmentsRepository.findById(request.getInstallmentsId())
                .orElseThrow(() -> new IllegalArgumentException("ไม่พบรายการผ่อนชำระ"));

        if (item.isDeleted()) {
            throw new IllegalArgumentException("ไม่สามารถแก้ไขรายการที่ลบไปแล้ว");
        }
        if (request.getUserId() != null && !request.getUserId().equals(item.getUserId())) {
            throw new IllegalArgumentException("ไม่มีสิทธิ์แก้ไขรายการนี้");
        }
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
        String method = (request.getCalculationMethod() != null)
                ? request.getCalculationMethod().toUpperCase()
                : "FLAT";

        int months = request.getInstallmentMonths();

        BigDecimal finalMonthlyAmount = request.getMonthlyAmount();
        if (finalMonthlyAmount == null || finalMonthlyAmount.compareTo(BigDecimal.ZERO) <= 0) {
            finalMonthlyAmount = computeMonthlyAmount(request.getTotalAmount(), months, actualInterestRate, type, method);
        }

        item.setInstallmentsName(request.getInstallmentsName());
        item.setDescription(request.getDescription());
        item.setTotalAmount(request.getTotalAmount());
        item.setInterestType(type);
        item.setCalculationMethod(method);
        item.setInterestRate(actualInterestRate);
        item.setInstallmentMonths(months);
        item.setMonthlyAmount(finalMonthlyAmount);
        if (request.getStartDate() != null) {
            item.setStartDate(request.getStartDate());
        }

        // ตัดงวดที่จ่ายเกินช่วงใหม่ออกอัตโนมัติ (เช่น ลดจาก 10 เหลือ 6 งวด -> เก็บแค่ 1..6)
        TreeSet<Integer> periods = new TreeSet<>();
        if (item.getPaidPeriods() != null && !item.getPaidPeriods().isBlank()) {
            for (String part : item.getPaidPeriods().split(",")) {
                String trimmed = part.trim();
                if (!trimmed.isEmpty()) {
                    int p = Integer.parseInt(trimmed);
                    if (p >= 1 && p <= months) {
                        periods.add(p);
                    }
                }
            }
        }
        String joined = periods.stream().map(String::valueOf).collect(Collectors.joining(","));
        item.setPaidPeriods(joined.isEmpty() ? null : joined);

        // คำนวณสถานะใหม่ให้สอดคล้องกับจำนวนงวดที่จ่ายครบ
        item.setStatus(periods.size() >= months ? "COMPLETED" : "ACTIVE");

        return installmentsRepository.save(item);
    }

    // flag delete รายการผ่อน (soft delete)
    @Transactional
    public void softDeleteInstallments(Long installmentsId, Long userId) {
        int result = installmentsRepository.softDeleteById(installmentsId, userId);
        if (result == 0) {
            throw new IllegalArgumentException("ไม่สามารถดำเนินการได้: หาไม่พบ หรือไม่มีสิทธิ์");
        }
    }

    // ยืนยัน/ยกเลิกการจ่ายรายงวด — เก็บเลขงวดที่จ่ายแล้วในคอลัมน์ paid_periods
    @Transactional
    public InstallmentsEntity updatePaidPeriod(Long installmentsId, Long userId, int period, boolean paid) {
        InstallmentsEntity item = installmentsRepository.findById(installmentsId)
                .orElseThrow(() -> new IllegalArgumentException("ไม่พบรายการผ่อนชำระ"));

        if (userId != null && !userId.equals(item.getUserId())) {
            throw new IllegalArgumentException("ไม่มีสิทธิ์แก้ไขรายการนี้");
        }
        if (period < 1 || period > item.getInstallmentMonths()) {
            throw new IllegalArgumentException("งวดที่ระบุไม่ถูกต้อง");
        }

        TreeSet<Integer> periods = new TreeSet<>();
        if (item.getPaidPeriods() != null && !item.getPaidPeriods().isBlank()) {
            for (String part : item.getPaidPeriods().split(",")) {
                String trimmed = part.trim();
                if (!trimmed.isEmpty()) {
                    periods.add(Integer.parseInt(trimmed));
                }
            }
        }

        if (paid) {
            periods.add(period);
        } else {
            periods.remove(period);
        }

        String joined = periods.stream().map(String::valueOf).collect(Collectors.joining(","));
        item.setPaidPeriods(joined.isEmpty() ? null : joined);

        // ปรับสถานะรายการให้สอดคล้องกับจำนวนงวดที่จ่ายครบ
        if (periods.size() >= item.getInstallmentMonths()) {
            item.setStatus("COMPLETED");
        } else if ("COMPLETED".equals(item.getStatus())) {
            item.setStatus("ACTIVE");
        }

        return installmentsRepository.save(item);
    }

}
