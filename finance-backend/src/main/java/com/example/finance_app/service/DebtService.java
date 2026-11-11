package com.example.finance_app.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.finance_app.dto.request.DebtPaymentRequest;
import com.example.finance_app.dto.request.DebtRequest;
import com.example.finance_app.dto.response.DebtPaymentResponse;
import com.example.finance_app.dto.response.DebtResponse;
import com.example.finance_app.entity.Debt;
import com.example.finance_app.entity.DebtPayment;
import com.example.finance_app.entity.Transaction;
import com.example.finance_app.repository.DebtPaymentRepository;
import com.example.finance_app.repository.DebtRepository;

import jakarta.transaction.Transactional;

// ติดตามหนี้: สร้างหนี้ = แค่จดไว้ (ไม่ใช่รายรับ)
// ชำระ = บันทึกการจ่าย + สร้างรายจ่ายหมวด "ชำระหนี้" อัตโนมัติ (หักจากยอดสุทธิ) · แบ่งจ่ายได้
// ลบหนี้ = ซ่อนรายการหนี้ แต่เก็บรายจ่ายที่จ่ายไปแล้วไว้ในประวัติธุรกรรม
@Service
public class DebtService {

    @Autowired
    private DebtRepository debtRepository;
    @Autowired
    private DebtPaymentRepository paymentRepository;
    @Autowired
    private TransactionService transactionService;

    // ---------- หนี้ ----------

    public List<DebtResponse> listDebts(Long userId) {
        requireUser(userId);
        // [debtId, sum, count, lastDate]
        Map<Long, Object[]> sums = new HashMap<>();
        for (Object[] row : paymentRepository.sumByDebt(userId)) {
            sums.put((Long) row[0], row);
        }
        return debtRepository.findActiveByUserId(userId).stream()
                .map(d -> toDebtResponse(d, sums.get(d.getDebtId())))
                .collect(Collectors.toList());
    }

    @Transactional
    public DebtResponse createDebt(DebtRequest req) {
        requireUser(req.getUserId());
        validateDebtFields(req);

        Debt debt = new Debt();
        debt.setUserId(req.getUserId());
        applyDebtFields(debt, req);
        debt.setStatus(Debt.ACTIVE);
        debt.setCreatedAt(LocalDateTime.now());
        return toDebtResponse(debtRepository.save(debt), null);
    }

    @Transactional
    public DebtResponse updateDebt(DebtRequest req) {
        Debt debt = loadDebt(req.getDebtId(), req.getUserId());
        validateDebtFields(req);

        BigDecimal paid = paymentRepository.sumPaid(debt.getDebtId());
        if (req.getTotalAmount().compareTo(paid) < 0) {
            throw new IllegalArgumentException("ยอดหนี้ต้องไม่น้อยกว่ายอดที่จ่ายไปแล้ว (" + paid.toPlainString() + " บาท)");
        }
        applyDebtFields(debt, req);
        refreshStatus(debt, paid);
        debtRepository.save(debt);
        return findDebtResponse(debt);
    }

    // ลบหนี้ (soft delete) — รายจ่ายชำระหนี้ที่บันทึกไปแล้วยังอยู่ในประวัติธุรกรรม (เงินจ่ายไปจริง)
    @Transactional
    public void deleteDebt(DebtRequest req) {
        Debt debt = loadDebt(req.getDebtId(), req.getUserId());
        debt.setDeleted(true);
        debtRepository.save(debt);
    }

    // ---------- ชำระ ----------

    @Transactional
    public DebtPaymentResponse pay(DebtPaymentRequest req) {
        Debt debt = loadDebt(req.getDebtId(), req.getUserId());
        requirePositive(req.getAmount());

        BigDecimal paid = paymentRepository.sumPaid(debt.getDebtId());
        BigDecimal remaining = debt.getTotalAmount().subtract(paid);
        if (remaining.signum() <= 0) {
            throw new IllegalArgumentException("หนี้รายการนี้ชำระครบแล้ว");
        }
        if (req.getAmount().compareTo(remaining) > 0) {
            throw new IllegalArgumentException("จ่ายเกินยอดคงเหลือ (คงเหลือ " + remaining.toPlainString() + " บาท)");
        }

        DebtPayment p = new DebtPayment();
        p.setDebtId(debt.getDebtId());
        p.setUserId(debt.getUserId());
        p.setAmount(req.getAmount());
        p.setPaymentDate(req.getPaymentDate() != null ? req.getPaymentDate() : LocalDateTime.now());
        p.setNote(trimToNull(req.getNote()));
        p.setCreatedAt(LocalDateTime.now());
        p = paymentRepository.save(p);

        // บันทึกการจ่ายก่อนเพื่อให้ได้ id ไปผูกกับรายจ่าย
        Transaction txn = transactionService.createDebtPayment(debt.getUserId(), p.getDebtPaymentId(),
                p.getAmount(), p.getPaymentDate(), describe(debt, p));
        p.setTransactionId(txn.getId());
        p = paymentRepository.save(p);

        refreshStatus(debt, paid.add(p.getAmount()));
        debtRepository.save(debt);
        return toPaymentResponse(p);
    }

    // แก้ยอด/วันที่/หมายเหตุของการจ่าย — รายจ่ายที่ผูกอยู่แก้ตามไปด้วย
    @Transactional
    public DebtPaymentResponse updatePayment(DebtPaymentRequest req) {
        DebtPayment p = loadPayment(req.getDebtPaymentId(), req.getUserId());
        Debt debt = loadDebt(p.getDebtId(), p.getUserId());
        requirePositive(req.getAmount());

        BigDecimal paidOthers = paymentRepository.sumPaid(debt.getDebtId()).subtract(p.getAmount());
        BigDecimal maxAmount = debt.getTotalAmount().subtract(paidOthers);
        if (req.getAmount().compareTo(maxAmount) > 0) {
            throw new IllegalArgumentException("จ่ายเกินยอดหนี้ (จ่ายได้ไม่เกิน " + maxAmount.toPlainString() + " บาท)");
        }

        p.setAmount(req.getAmount());
        if (req.getPaymentDate() != null) {
            p.setPaymentDate(req.getPaymentDate());
        }
        p.setNote(trimToNull(req.getNote()));
        p = paymentRepository.save(p);

        if (p.getTransactionId() != null) {
            transactionService.updateLinkedTransaction(p.getTransactionId(), p.getAmount(),
                    p.getPaymentDate(), describe(debt, p));
        }

        refreshStatus(debt, paidOthers.add(p.getAmount()));
        debtRepository.save(debt);
        return toPaymentResponse(p);
    }

    // ลบการจ่าย (soft delete) + ลบรายจ่ายที่ผูกอยู่ ยอดคงเหลือของหนี้กลับมาเพิ่ม
    @Transactional
    public void deletePayment(DebtPaymentRequest req) {
        DebtPayment p = loadPayment(req.getDebtPaymentId(), req.getUserId());
        Debt debt = loadDebt(p.getDebtId(), p.getUserId());
        // คิดยอดก่อน flag ลบ (query หลัง save จะไม่นับรายการนี้แล้ว)
        BigDecimal paidAfter = paymentRepository.sumPaid(debt.getDebtId()).subtract(p.getAmount());

        p.setDeleted(true);
        paymentRepository.save(p);
        if (p.getTransactionId() != null) {
            transactionService.cancelLinkedTransaction(p.getTransactionId());
        }

        refreshStatus(debt, paidAfter);
        debtRepository.save(debt);
    }

    public List<DebtPaymentResponse> listPayments(DebtPaymentRequest req) {
        Debt debt = loadDebt(req.getDebtId(), req.getUserId());
        return paymentRepository.findByDebt(debt.getDebtId()).stream()
                .map(this::toPaymentResponse)
                .collect(Collectors.toList());
    }

    // ---------- helpers ----------

    // จ่ายครบ = PAID (เก็บวันที่ครบ) · ยังไม่ครบ = ACTIVE
    private void refreshStatus(Debt debt, BigDecimal paid) {
        if (paid.compareTo(debt.getTotalAmount()) >= 0) {
            if (!Debt.PAID.equals(debt.getStatus()) || debt.getPaidOffAt() == null) {
                debt.setPaidOffAt(LocalDateTime.now());
            }
            debt.setStatus(Debt.PAID);
        } else {
            debt.setStatus(Debt.ACTIVE);
            debt.setPaidOffAt(null);
        }
    }

    private Debt loadDebt(Long debtId, Long userId) {
        requireUser(userId);
        if (debtId == null) {
            throw new IllegalArgumentException("ไม่พบรหัสรายการหนี้");
        }
        Debt debt = debtRepository.findActiveById(debtId)
                .orElseThrow(() -> new IllegalArgumentException("ไม่พบรายการหนี้"));
        if (!userId.equals(debt.getUserId())) {
            throw new IllegalArgumentException("ไม่มีสิทธิ์จัดการรายการนี้");
        }
        return debt;
    }

    private DebtPayment loadPayment(Long paymentId, Long userId) {
        requireUser(userId);
        if (paymentId == null) {
            throw new IllegalArgumentException("ไม่พบรหัสรายการชำระ");
        }
        DebtPayment p = paymentRepository.findActiveById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("ไม่พบรายการชำระ"));
        if (!userId.equals(p.getUserId())) {
            throw new IllegalArgumentException("ไม่มีสิทธิ์จัดการรายการนี้");
        }
        return p;
    }

    private void validateDebtFields(DebtRequest req) {
        if (req.getCreditorName() == null || req.getCreditorName().isBlank()) {
            throw new IllegalArgumentException("กรุณาระบุว่าติดหนี้ใคร");
        }
        if (req.getCreditorName().trim().length() > 100) {
            throw new IllegalArgumentException("ชื่อเจ้าหนี้ยาวเกิน 100 ตัวอักษร");
        }
        requirePositive(req.getTotalAmount());
        LocalDate borrow = req.getBorrowDate() != null ? req.getBorrowDate() : LocalDate.now();
        if (req.getDueDate() != null && req.getDueDate().isBefore(borrow)) {
            throw new IllegalArgumentException("กำหนดคืนต้องไม่ก่อนวันที่ยืม");
        }
    }

    private void applyDebtFields(Debt debt, DebtRequest req) {
        debt.setCreditorName(req.getCreditorName().trim());
        debt.setDescription(trimToNull(req.getDescription()));
        debt.setTotalAmount(req.getTotalAmount());
        if (req.getBorrowDate() != null) {
            debt.setBorrowDate(req.getBorrowDate());
        } else if (debt.getBorrowDate() == null) {
            debt.setBorrowDate(LocalDate.now());
        }
        debt.setDueDate(req.getDueDate());
    }

    private void requireUser(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("ไม่พบผู้ใช้");
        }
    }

    private void requirePositive(BigDecimal amount) {
        if (amount == null || amount.signum() <= 0) {
            throw new IllegalArgumentException("ยอดเงินต้องมากกว่า 0");
        }
    }

    private String trimToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }

    // รายละเอียดของรายจ่ายที่ระบบสร้าง เช่น "ชำระหนี้: พี่เอ — งวดแรก"
    private String describe(Debt debt, DebtPayment p) {
        String base = "ชำระหนี้: " + debt.getCreditorName();
        return p.getNote() != null ? base + " — " + p.getNote() : base;
    }

    private DebtResponse findDebtResponse(Debt debt) {
        return listDebts(debt.getUserId()).stream()
                .filter(r -> r.getDebtId().equals(debt.getDebtId()))
                .findFirst()
                .orElseGet(() -> toDebtResponse(debt, null));
    }

    private DebtResponse toDebtResponse(Debt d, Object[] sum) {
        BigDecimal paid = sum != null && sum[1] != null ? new BigDecimal(sum[1].toString()) : BigDecimal.ZERO;
        BigDecimal remaining = d.getTotalAmount().subtract(paid).max(BigDecimal.ZERO);

        DebtResponse r = new DebtResponse();
        r.setDebtId(d.getDebtId());
        r.setCreditorName(d.getCreditorName());
        r.setDescription(d.getDescription());
        r.setTotalAmount(d.getTotalAmount());
        r.setPaidAmount(paid);
        r.setRemaining(remaining);
        r.setProgress(d.getTotalAmount().signum() > 0
                ? paid.divide(d.getTotalAmount(), 4, RoundingMode.HALF_UP).min(BigDecimal.ONE)
                : BigDecimal.ZERO);
        r.setBorrowDate(d.getBorrowDate());
        r.setDueDate(d.getDueDate());
        r.setStatus(d.getStatus());
        r.setOverdue(Debt.ACTIVE.equals(d.getStatus()) && d.getDueDate() != null
                && d.getDueDate().isBefore(LocalDate.now()));
        r.setPaymentCount(sum != null && sum[2] != null ? ((Number) sum[2]).longValue() : 0);
        r.setLastPaymentDate(sum != null ? (LocalDateTime) sum[3] : null);
        r.setCreatedAt(d.getCreatedAt());
        r.setPaidOffAt(d.getPaidOffAt());
        return r;
    }

    private DebtPaymentResponse toPaymentResponse(DebtPayment p) {
        DebtPaymentResponse r = new DebtPaymentResponse();
        r.setDebtPaymentId(p.getDebtPaymentId());
        r.setDebtId(p.getDebtId());
        r.setAmount(p.getAmount());
        r.setPaymentDate(p.getPaymentDate());
        r.setNote(p.getNote());
        r.setTransactionId(p.getTransactionId());
        return r;
    }
}
