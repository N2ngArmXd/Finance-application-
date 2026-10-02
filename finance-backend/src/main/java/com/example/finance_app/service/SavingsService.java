package com.example.finance_app.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import com.example.finance_app.dto.request.SavingsGoalRequest;
import com.example.finance_app.dto.request.SavingsMovementRequest;
import com.example.finance_app.dto.response.SavingsGoalResponse;
import com.example.finance_app.dto.response.SavingsMovementPageResponse;
import com.example.finance_app.dto.response.SavingsMovementResponse;
import com.example.finance_app.entity.Categories;
import com.example.finance_app.entity.SavingsGoal;
import com.example.finance_app.entity.SavingsMovement;
import com.example.finance_app.entity.Transaction;
import com.example.finance_app.repository.SavingsGoalRepository;
import com.example.finance_app.repository.SavingsMovementRepository;
import com.example.finance_app.repository.TransactionRepository;

import jakarta.transaction.Transactional;

// เงินออม: ฝาก = ย้ายเงินจากเงินใช้ได้เข้ากระปุก (ไม่ใช่รายจ่าย)
// ถอน TO_WALLET = ย้ายกลับ, ถอน SPEND = ออกจากกระปุก + สร้างรายจ่ายอัตโนมัติ
// ดู docs/design/savings-goals-brief.md
@Service
public class SavingsService {

    public static final String MODE_TO_WALLET = "TO_WALLET";
    public static final String MODE_SPEND = "SPEND";
    private static final String STATUS_ACTIVE = "ACTIVE";
    private static final String STATUS_ARCHIVED = "ARCHIVED";

    @Autowired
    private SavingsGoalRepository goalRepository;
    @Autowired
    private SavingsMovementRepository movementRepository;
    @Autowired
    private TransactionRepository transactionRepository;
    @Autowired
    private TransactionService transactionService;

    // ---------- กระปุก ----------

    public List<SavingsGoalResponse> listGoals(Long userId) {
        requireUser(userId);
        YearMonth month = YearMonth.now();

        // [goalId, balance, depositedThisMonth]
        Map<Long, Object[]> sums = new HashMap<>();
        for (Object[] row : movementRepository.sumByGoal(userId,
                month.atDay(1).atStartOfDay(), month.plusMonths(1).atDay(1).atStartOfDay())) {
            sums.put((Long) row[0], row);
        }

        return goalRepository.findActiveByUserId(userId).stream().map(g -> {
            Object[] row = sums.get(g.getSavingsGoalId());
            BigDecimal balance = row != null ? toBigDecimal(row[1]) : BigDecimal.ZERO;
            BigDecimal deposited = row != null ? toBigDecimal(row[2]) : BigDecimal.ZERO;
            return toGoalResponse(g, balance, deposited);
        }).collect(Collectors.toList());
    }

    @Transactional
    public SavingsGoalResponse createGoal(SavingsGoalRequest req) {
        requireUser(req.getUserId());
        validateGoalFields(req);

        SavingsGoal goal = new SavingsGoal();
        goal.setUserId(req.getUserId());
        applyGoalFields(goal, req);
        goal.setStatus(STATUS_ACTIVE);
        goal.setCreatedAt(LocalDateTime.now());
        goal = goalRepository.save(goal);

        BigDecimal balance = BigDecimal.ZERO;
        if (req.getInitialDeposit() != null && req.getInitialDeposit().compareTo(BigDecimal.ZERO) > 0) {
            saveTransfer(goal, SavingsMovement.DEPOSIT, req.getInitialDeposit(), LocalDateTime.now(), "ฝากครั้งแรก");
            balance = req.getInitialDeposit();
        }
        return toGoalResponse(goal, balance, balance);
    }

    @Transactional
    public SavingsGoalResponse updateGoal(SavingsGoalRequest req) {
        SavingsGoal goal = loadGoal(req.getSavingsGoalId(), req.getUserId());
        validateGoalFields(req);
        applyGoalFields(goal, req);
        goalRepository.save(goal);
        return findGoalResponse(goal);
    }

    // ปิดกระปุก — ยอดต้องเป็น 0 ก่อน หรือส่ง withdrawAll = true ให้ถอนที่เหลือกลับเข้ากระเป๋าแล้วปิด
    @Transactional
    public SavingsGoalResponse archiveGoal(SavingsGoalRequest req) {
        SavingsGoal goal = loadGoal(req.getSavingsGoalId(), req.getUserId());
        if (STATUS_ARCHIVED.equals(goal.getStatus())) {
            throw new IllegalArgumentException("กระปุกนี้ปิดไปแล้ว");
        }
        BigDecimal balance = movementRepository.sumBalance(goal.getSavingsGoalId());
        if (balance.signum() > 0) {
            if (!Boolean.TRUE.equals(req.getWithdrawAll())) {
                throw new IllegalArgumentException("ยังมีเงินในกระปุก " + balance.toPlainString()
                        + " บาท ต้องถอนออกให้หมดก่อนปิดกระปุก");
            }
            saveTransfer(goal, SavingsMovement.WITHDRAW, balance, LocalDateTime.now(), "ถอนทั้งหมดก่อนปิดกระปุก");
        }
        goal.setStatus(STATUS_ARCHIVED);
        goal.setArchivedAt(LocalDateTime.now());
        goalRepository.save(goal);
        return findGoalResponse(goal);
    }

    // เปิดกระปุกที่ปิดไปแล้วกลับมาใช้อีกครั้ง
    @Transactional
    public SavingsGoalResponse reopenGoal(SavingsGoalRequest req) {
        SavingsGoal goal = loadGoal(req.getSavingsGoalId(), req.getUserId());
        if (!STATUS_ARCHIVED.equals(goal.getStatus())) {
            throw new IllegalArgumentException("กระปุกนี้ยังเปิดใช้งานอยู่");
        }
        goal.setStatus(STATUS_ACTIVE);
        goal.setArchivedAt(null);
        goalRepository.save(goal);
        return findGoalResponse(goal);
    }

    // ลบกระปุก (soft delete) — ทำได้เมื่อยอดเป็น 0 เท่านั้น ประวัติฝาก-ถอนยังเก็บไว้
    @Transactional
    public void deleteGoal(SavingsGoalRequest req) {
        SavingsGoal goal = loadGoal(req.getSavingsGoalId(), req.getUserId());
        BigDecimal balance = movementRepository.sumBalance(goal.getSavingsGoalId());
        if (balance.signum() != 0) {
            throw new IllegalArgumentException("ยังมีเงินในกระปุก " + balance.toPlainString()
                    + " บาท ต้องถอนออกให้หมดก่อนลบ");
        }
        goal.setDeleted(true);
        goalRepository.save(goal);
    }

    // ---------- ฝาก / ถอน ----------

    @Transactional
    public SavingsMovementResponse deposit(SavingsMovementRequest req) {
        SavingsGoal goal = loadOpenGoal(req.getSavingsGoalId(), req.getUserId());
        requirePositive(req.getAmount());
        SavingsMovement m = saveTransfer(goal, SavingsMovement.DEPOSIT, req.getAmount(),
                dateOrNow(req.getMovementDate()), req.getNote());
        return toMovementResponse(m, null);
    }

    @Transactional
    public SavingsMovementResponse withdraw(SavingsMovementRequest req) {
        SavingsGoal goal = loadOpenGoal(req.getSavingsGoalId(), req.getUserId());
        requirePositive(req.getAmount());
        String mode = req.getMode() != null ? req.getMode().toUpperCase() : MODE_TO_WALLET;
        if (!MODE_TO_WALLET.equals(mode) && !MODE_SPEND.equals(mode)) {
            throw new IllegalArgumentException("รูปแบบการถอนไม่ถูกต้อง (TO_WALLET หรือ SPEND)");
        }

        BigDecimal balance = movementRepository.sumBalance(goal.getSavingsGoalId());
        if (req.getAmount().compareTo(balance) > 0) {
            throw new IllegalArgumentException("ถอนเกินยอดในกระปุก (คงเหลือ " + balance.toPlainString() + " บาท)");
        }

        LocalDateTime date = dateOrNow(req.getMovementDate());
        if (MODE_TO_WALLET.equals(mode)) {
            SavingsMovement m = saveTransfer(goal, SavingsMovement.WITHDRAW, req.getAmount(), date, req.getNote());
            return toMovementResponse(m, null);
        }

        // ถอนไปใช้: บันทึกรายการถอนก่อนเพื่อให้ได้ id ไปผูกกับรายจ่าย
        SavingsMovement m = saveMovement(goal, SavingsMovement.WITHDRAW, req.getAmount(), date, req.getNote());
        Transaction txn = transactionService.createSavingsSpend(goal.getUserId(), m.getSavingsMovementId(),
                req.getCategoryId(), req.getAmount(), date, describe(goal, m, true));
        m.setTransactionId(txn.getId());
        return toMovementResponse(movementRepository.save(m), txn);
    }

    // แก้ยอด/วันที่/หมายเหตุ (+ หมวดหมู่ถ้าเป็นถอนไปใช้) — เปลี่ยนประเภทไม่ได้ ให้ลบแล้วทำใหม่
    @Transactional
    public SavingsMovementResponse updateMovement(SavingsMovementRequest req) {
        SavingsMovement m = loadMovement(req.getSavingsMovementId(), req.getUserId());
        SavingsGoal goal = loadOpenGoal(m.getSavingsGoalId(), m.getUserId());
        requirePositive(req.getAmount());

        BigDecimal newSigned = SavingsMovement.DEPOSIT.equals(m.getType()) ? req.getAmount() : req.getAmount().negate();
        BigDecimal newBalance = movementRepository.sumBalance(goal.getSavingsGoalId())
                .subtract(m.signedAmount()).add(newSigned);
        if (newBalance.signum() < 0) {
            throw new IllegalArgumentException("แก้แล้วยอดในกระปุกจะติดลบ");
        }

        m.setAmount(req.getAmount());
        if (req.getMovementDate() != null) {
            m.setMovementDate(req.getMovementDate());
        }
        m.setNote(req.getNote());
        m = movementRepository.save(m);

        Transaction txn = m.getTransactionId() != null
                ? transactionRepository.findById(m.getTransactionId()).orElse(null)
                : null;
        if (txn != null) {
            boolean spend = isSpend(m, txn);
            transactionService.updateSavingsTransaction(txn.getId(), spend ? req.getCategoryId() : null,
                    m.getAmount(), m.getMovementDate(), describe(goal, m, spend));
            txn = transactionRepository.findById(txn.getId()).orElse(null);
        }
        return toMovementResponse(m, txn);
    }

    // ลบรายการฝาก/ถอน (soft delete) — ลบ transaction ที่ผูกอยู่ (ฝาก/ถอน/รายจ่าย) ด้วย
    @Transactional
    public void deleteMovement(SavingsMovementRequest req) {
        SavingsMovement m = loadMovement(req.getSavingsMovementId(), req.getUserId());
        loadOpenGoal(m.getSavingsGoalId(), m.getUserId());

        BigDecimal newBalance = movementRepository.sumBalance(m.getSavingsGoalId()).subtract(m.signedAmount());
        if (newBalance.signum() < 0) {
            throw new IllegalArgumentException("ลบรายการฝากนี้ไม่ได้ เพราะเงินถูกถอนออกไปแล้ว (ยอดในกระปุกจะติดลบ)");
        }

        m.setDeleted(true);
        movementRepository.save(m);
        if (m.getTransactionId() != null) {
            transactionService.cancelSavingsTransaction(m.getTransactionId());
        }
    }

    public SavingsMovementPageResponse listMovements(SavingsMovementRequest req) {
        SavingsGoal goal = loadGoal(req.getSavingsGoalId(), req.getUserId());
        int page = (req.getPage() != null && req.getPage() > 0) ? req.getPage() - 1 : 0;
        int size = (req.getSize() != null && req.getSize() > 0) ? req.getSize() : 20;

        Page<SavingsMovement> result = movementRepository.findByGoal(goal.getSavingsGoalId(),
                PageRequest.of(page, size));

        // ดึงรายจ่ายของรายการถอนไปใช้ทั้งหน้าในครั้งเดียว (เอาหมวดหมู่ไปแสดง)
        List<Long> txnIds = result.getContent().stream()
                .map(SavingsMovement::getTransactionId)
                .filter(id -> id != null)
                .collect(Collectors.toList());
        Map<Long, Transaction> txns = new HashMap<>();
        transactionRepository.findAllById(txnIds).forEach(t -> txns.put(t.getId(), t));

        List<SavingsMovementResponse> content = result.getContent().stream()
                .map(m -> toMovementResponse(m, m.getTransactionId() != null ? txns.get(m.getTransactionId()) : null))
                .collect(Collectors.toList());

        return new SavingsMovementPageResponse(content, result.getNumber() + 1, result.getSize(),
                result.getTotalElements(), result.getTotalPages(),
                movementRepository.sumBalance(goal.getSavingsGoalId()));
    }

    // ---------- helpers ----------

    // ฝาก / ถอนกลับเข้ากระเป๋า: บันทึกรายการ + transaction หมวดฝาก/ถอนเงินออม ให้ขึ้นในหน้าประวัติ
    private SavingsMovement saveTransfer(SavingsGoal goal, String type, BigDecimal amount,
            LocalDateTime date, String note) {
        SavingsMovement m = saveMovement(goal, type, amount, date, note);
        Transaction txn = transactionService.createSavingsTransfer(goal.getUserId(), m.getSavingsMovementId(),
                SavingsMovement.DEPOSIT.equals(type), amount, date, describe(goal, m, false));
        m.setTransactionId(txn.getId());
        return movementRepository.save(m);
    }

    // ถอนไปใช้ = ถอนที่ผูกกับรายจ่าย (ถอนกลับเข้ากระเป๋าผูกกับหมวด SAVING_OUT)
    private boolean isSpend(SavingsMovement m, Transaction txn) {
        return SavingsMovement.WITHDRAW.equals(m.getType()) && txn != null && txn.getCategoryId() != null
                && "EXPENSE".equalsIgnoreCase(txn.getCategoryId().getType());
    }

    private SavingsMovement saveMovement(SavingsGoal goal, String type, BigDecimal amount,
            LocalDateTime date, String note) {
        SavingsMovement m = new SavingsMovement();
        m.setSavingsGoalId(goal.getSavingsGoalId());
        m.setUserId(goal.getUserId());
        m.setType(type);
        m.setAmount(amount);
        m.setMovementDate(date);
        m.setNote(note);
        m.setCreatedAt(LocalDateTime.now());
        return movementRepository.save(m);
    }

    private SavingsGoal loadGoal(Long goalId, Long userId) {
        requireUser(userId);
        if (goalId == null) {
            throw new IllegalArgumentException("ไม่พบรหัสกระปุก");
        }
        SavingsGoal goal = goalRepository.findActiveById(goalId)
                .orElseThrow(() -> new IllegalArgumentException("ไม่พบกระปุกเงินออม"));
        if (!userId.equals(goal.getUserId())) {
            throw new IllegalArgumentException("ไม่มีสิทธิ์จัดการกระปุกนี้");
        }
        return goal;
    }

    // กระปุกที่ปิดแล้วยอดเป็น 0 — ห้ามฝาก/ถอน/แก้ประวัติ จนกว่าจะเปิดใช้อีกครั้ง
    private SavingsGoal loadOpenGoal(Long goalId, Long userId) {
        SavingsGoal goal = loadGoal(goalId, userId);
        if (STATUS_ARCHIVED.equals(goal.getStatus())) {
            throw new IllegalArgumentException("กระปุกนี้ปิดแล้ว เปิดใช้อีกครั้งก่อนจึงจะฝาก/ถอนได้");
        }
        return goal;
    }

    private SavingsMovement loadMovement(Long movementId, Long userId) {
        requireUser(userId);
        if (movementId == null) {
            throw new IllegalArgumentException("ไม่พบรหัสรายการ");
        }
        SavingsMovement m = movementRepository.findActiveById(movementId)
                .orElseThrow(() -> new IllegalArgumentException("ไม่พบรายการฝาก/ถอน"));
        if (!userId.equals(m.getUserId())) {
            throw new IllegalArgumentException("ไม่มีสิทธิ์จัดการรายการนี้");
        }
        return m;
    }

    private void validateGoalFields(SavingsGoalRequest req) {
        if (req.getName() == null || req.getName().isBlank()) {
            throw new IllegalArgumentException("กรุณาตั้งชื่อกระปุก");
        }
        if (req.getTargetAmount() != null && req.getTargetAmount().signum() <= 0) {
            throw new IllegalArgumentException("ยอดเป้าหมายต้องมากกว่า 0");
        }
    }

    private void applyGoalFields(SavingsGoal goal, SavingsGoalRequest req) {
        goal.setName(req.getName().trim());
        goal.setDescription(req.getDescription());
        goal.setTargetAmount(req.getTargetAmount());
        goal.setTargetDate(req.getTargetDate());
        goal.setIcon(req.getIcon());
        goal.setColor(req.getColor());
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

    private LocalDateTime dateOrNow(LocalDateTime date) {
        return date != null ? date : LocalDateTime.now();
    }

    // รายละเอียดของ transaction ที่ระบบสร้าง เช่น "ฝากเงินออม: เที่ยวญี่ปุ่น — เงินเดือน ต.ค."
    private String describe(SavingsGoal goal, SavingsMovement m, boolean spend) {
        String base = (SavingsMovement.DEPOSIT.equals(m.getType()) ? "ฝากเงินออม: "
                : spend ? "ใช้เงินออม: " : "ถอนเงินออม: ") + goal.getName();
        String note = m.getNote();
        return (note != null && !note.isBlank()) ? base + " — " + note.trim() : base;
    }

    private SavingsGoalResponse findGoalResponse(SavingsGoal goal) {
        return listGoals(goal.getUserId()).stream()
                .filter(r -> r.getSavingsGoalId().equals(goal.getSavingsGoalId()))
                .findFirst()
                .orElseGet(() -> toGoalResponse(goal, BigDecimal.ZERO, BigDecimal.ZERO));
    }

    private SavingsGoalResponse toGoalResponse(SavingsGoal g, BigDecimal balance, BigDecimal depositedThisMonth) {
        SavingsGoalResponse r = new SavingsGoalResponse();
        r.setSavingsGoalId(g.getSavingsGoalId());
        r.setName(g.getName());
        r.setDescription(g.getDescription());
        r.setTargetAmount(g.getTargetAmount());
        r.setTargetDate(g.getTargetDate());
        r.setIcon(g.getIcon());
        r.setColor(g.getColor());
        r.setStatus(g.getStatus());
        r.setCreatedAt(g.getCreatedAt());
        r.setArchivedAt(g.getArchivedAt());
        r.setBalance(balance);
        r.setDepositedThisMonth(depositedThisMonth);

        BigDecimal target = g.getTargetAmount();
        if (target != null && target.signum() > 0) {
            r.setProgress(balance.divide(target, 4, RoundingMode.HALF_UP));
            r.setReached(balance.compareTo(target) >= 0);

            LocalDate targetDate = g.getTargetDate();
            if (!r.isReached() && targetDate != null) {
                // นับเดือนที่เหลือรวมเดือนนี้ (ต.ค. -> เม.ย. = 6 เดือน)
                long monthsLeft = ChronoUnit.MONTHS.between(YearMonth.now(), YearMonth.from(targetDate));
                if (targetDate.isBefore(LocalDate.now())) {
                    r.setOverdue(true);
                } else {
                    r.setSuggestedMonthly(target.subtract(balance)
                            .divide(BigDecimal.valueOf(Math.max(monthsLeft, 1)), 2, RoundingMode.HALF_UP));
                }
            }
        }
        return r;
    }

    private SavingsMovementResponse toMovementResponse(SavingsMovement m, Transaction txn) {
        SavingsMovementResponse r = new SavingsMovementResponse();
        r.setSavingsMovementId(m.getSavingsMovementId());
        r.setSavingsGoalId(m.getSavingsGoalId());
        r.setType(m.getType());
        boolean spend = isSpend(m, txn);
        r.setMode(SavingsMovement.DEPOSIT.equals(m.getType()) ? SavingsMovement.DEPOSIT
                : spend ? MODE_SPEND : MODE_TO_WALLET);
        r.setAmount(m.getAmount());
        r.setMovementDate(m.getMovementDate());
        r.setNote(m.getNote());
        r.setTransactionId(m.getTransactionId());
        if (spend) {
            Categories c = txn.getCategoryId();
            r.setCategoryId(c.getId());
            r.setCategoryName(c.getName());
            r.setCategoryIcon(c.getIcon());
        }
        return r;
    }

    private BigDecimal toBigDecimal(Object value) {
        return value != null ? new BigDecimal(value.toString()) : BigDecimal.ZERO;
    }
}
