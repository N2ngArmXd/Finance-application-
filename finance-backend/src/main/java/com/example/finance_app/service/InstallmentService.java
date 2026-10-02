package com.example.finance_app.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.TreeSet;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.finance_app.dto.request.InstallmentsRequest;
import com.example.finance_app.entity.InstallmentsEntity;
import com.example.finance_app.repository.InstallmentsRepository;

import jakarta.transaction.Transactional;

@Service
public class InstallmentService {

    @Autowired
    private InstallmentsRepository installmentsRepository;
    @Autowired
    private TransactionService transactionService;

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
        if ("CLOSED".equals(item.getStatus())) {
            throw new IllegalArgumentException("ไม่สามารถแก้ไขรายการที่ปิดยอดแล้ว");
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
        List<Integer> removedPeriods = new ArrayList<>();
        if (item.getPaidPeriods() != null && !item.getPaidPeriods().isBlank()) {
            for (String part : item.getPaidPeriods().split(",")) {
                String trimmed = part.trim();
                if (!trimmed.isEmpty()) {
                    int p = Integer.parseInt(trimmed);
                    if (p >= 1 && p <= months) {
                        periods.add(p);
                    } else {
                        removedPeriods.add(p);
                    }
                }
            }
        }
        // งวดที่ถูกตัดออก ให้ยกเลิกรายจ่ายค่างวดของงวดนั้นด้วย
        transactionService.cancelInstallmentPayments(item.getInstallmentsId(), removedPeriods);
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
        if ("CLOSED".equals(item.getStatus())) {
            throw new IllegalArgumentException("ไม่สามารถแก้ไขงวดของรายการที่ปิดยอดแล้ว");
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

        // จ่ายงวด = สร้างรายจ่ายลงวันที่กดจ่าย, ยกเลิก = ลบรายจ่ายนั้นทิ้ง (เช็คสถานะเดิมกันสร้างซ้ำ)
        if (paid && periods.add(period)) {
            transactionService.createInstallmentPayment(item.getUserId(), installmentsId, period,
                    item.getMonthlyAmount(),
                    "ค่างวด " + item.getInstallmentsName() + " งวดที่ " + period + "/" + item.getInstallmentMonths());
        } else if (!paid && periods.remove(period)) {
            transactionService.cancelInstallmentPayments(installmentsId, List.of(period));
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

    // ปิดยอดรายการผ่อน — เปลี่ยนสถานะเป็น CLOSED และเก็บ log วันที่ปิดใน closed_at
    // ไม่แตะ paid_periods เพื่อเก็บประวัติว่าก่อนปิดจ่ายจริงไปกี่งวด
    @Transactional
    public InstallmentsEntity closeInstallment(Long installmentsId, Long userId) {
        InstallmentsEntity item = installmentsRepository.findById(installmentsId)
                .orElseThrow(() -> new IllegalArgumentException("ไม่พบรายการผ่อนชำระ"));

        if (item.isDeleted()) {
            throw new IllegalArgumentException("ไม่สามารถปิดยอดรายการที่ลบไปแล้ว");
        }
        if (userId != null && !userId.equals(item.getUserId())) {
            throw new IllegalArgumentException("ไม่มีสิทธิ์แก้ไขรายการนี้");
        }
        if (!"ACTIVE".equals(item.getStatus())) {
            throw new IllegalArgumentException("ปิดยอดได้เฉพาะรายการที่กำลังผ่อนอยู่");
        }

        item.setStatus("CLOSED");
        item.setClosedAt(LocalDateTime.now());

        return installmentsRepository.save(item);
    }
}
