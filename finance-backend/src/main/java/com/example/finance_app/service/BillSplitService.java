package com.example.finance_app.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.finance_app.dto.request.BillRequest;
import com.example.finance_app.dto.response.BillResponse;
import com.example.finance_app.dto.response.DebtResponse;
import com.example.finance_app.entity.Categories;
import com.example.finance_app.entity.Debt;
import com.example.finance_app.entity.DebtGroup;
import com.example.finance_app.entity.Transaction;
import com.example.finance_app.repository.DebtGroupRepository;
import com.example.finance_app.repository.DebtPaymentRepository;
import com.example.finance_app.repository.DebtRepository;
import com.example.finance_app.repository.TransactionRepository;

import jakarta.transaction.Transactional;

// บิลหาร ("เขาติดหนี้เรา"): เราออกเงินก่อน แล้วทวงคืนจากเพื่อน
// - สร้างบิล = จดยอดบิล + สร้างหนี้ทิศ RECEIVABLE ให้แต่ละคน (+ ลงรายจ่ายยอดเต็มถ้าเลือก)
// - แก้บิล = แก้ชื่อ/ยอด/วันที่/คน (คนที่คืนเงินแล้วลบไม่ได้ และยอดต้องไม่น้อยกว่าที่ได้รับ) รายจ่ายยอดเต็มแก้ตาม
// - เพื่อนคืนเงิน = ใช้ /debts/pay กับหนี้ของคนนั้น -> ระบบลงรายรับ "เงินคืน" ให้ (DebtService.pay)
// - ลบบิล = ซ่อนบิล + คนในบิล แต่รายจ่าย/รายรับที่บันทึกไปแล้วยังอยู่ในประวัติ
@Service
public class BillSplitService {

    @Autowired
    private DebtGroupRepository groupRepository;
    @Autowired
    private DebtRepository debtRepository;
    @Autowired
    private DebtPaymentRepository paymentRepository;
    @Autowired
    private TransactionRepository transactionRepository;
    @Autowired
    private TransactionService transactionService;
    @Autowired
    private DebtService debtService;

    public List<BillResponse> listBills(Long userId) {
        requireUser(userId);
        List<DebtGroup> groups = groupRepository.findActiveByUserId(userId);
        if (groups.isEmpty()) {
            return new ArrayList<>();
        }

        // ยอดที่ได้คืนแล้วของแต่ละคน [debtId, sum, count, lastDate]
        Map<Long, Object[]> sums = new HashMap<>();
        for (Object[] row : paymentRepository.sumByDebt(userId)) {
            sums.put((Long) row[0], row);
        }
        Map<Long, List<DebtResponse>> membersByGroup = new HashMap<>();
        for (Debt d : debtRepository.findActiveByGroupIds(
                groups.stream().map(DebtGroup::getGroupId).collect(Collectors.toList()))) {
            membersByGroup.computeIfAbsent(d.getGroupId(), k -> new ArrayList<>())
                    .add(debtService.toDebtResponse(d, sums.get(d.getDebtId())));
        }

        // หมวดของรายจ่ายยอดเต็ม (ถ้ายังอยู่)
        Set<Long> txnIds = groups.stream().map(DebtGroup::getTransactionId)
                .filter(id -> id != null).collect(Collectors.toSet());
        Map<Long, Transaction> txns = new HashMap<>();
        transactionRepository.findAllById(txnIds).forEach(t -> txns.put(t.getId(), t));

        return groups.stream()
                .map(g -> toResponse(g, membersByGroup.getOrDefault(g.getGroupId(), new ArrayList<>()),
                        g.getTransactionId() != null ? txns.get(g.getTransactionId()) : null))
                .collect(Collectors.toList());
    }

    @Transactional
    public BillResponse createBill(BillRequest req) {
        requireUser(req.getUserId());
        Validated v = validate(req);

        DebtGroup g = new DebtGroup();
        g.setUserId(req.getUserId());
        g.setCreatedAt(LocalDateTime.now());
        applyGroupFields(g, req, v);
        g = groupRepository.save(g);

        List<DebtResponse> memberResponses = new ArrayList<>();
        for (BillRequest.Member m : req.getMembers()) {
            memberResponses.add(debtService.toDebtResponse(newMember(g, m), null));
        }

        // ลงรายจ่ายยอดเต็ม (เงินออกจากกระเป๋าจริงทั้งก้อน) — เพื่อนคืนแล้วสุทธิจะเหลือแค่ส่วนของเรา
        Transaction txn = null;
        if (Boolean.TRUE.equals(req.getRecordExpense())) {
            txn = transactionService.createLinkedExpense(req.getUserId(), req.getCategoryId(), g.getTotalAmount(),
                    expenseDate(g.getBillDate(), null), expenseDescription(g));
            g.setTransactionId(txn.getId());
            g = groupRepository.save(g);
        }
        return toResponse(g, memberResponses, txn);
    }

    // แก้บิล: คนเดิมส่ง debtId มา · คนใหม่ debtId = null · คนที่ไม่ได้ส่งมา = เอาออก (ต้องยังไม่ได้คืนเงิน)
    @Transactional
    public BillResponse updateBill(BillRequest req) {
        DebtGroup g = loadGroup(req.getGroupId(), req.getUserId());
        Validated v = validate(req);

        Map<Long, Debt> existing = new HashMap<>();
        for (Debt d : debtRepository.findActiveByGroupIds(List.of(g.getGroupId()))) {
            existing.put(d.getDebtId(), d);
        }

        // ตรวจทุกคนก่อนเขียนข้อมูล
        Set<Long> keep = new HashSet<>();
        for (BillRequest.Member m : req.getMembers()) {
            if (m.getDebtId() == null) {
                continue;
            }
            Debt d = existing.get(m.getDebtId());
            if (d == null) {
                throw new IllegalArgumentException("ไม่พบ " + m.getName().trim() + " ในบิลนี้");
            }
            BigDecimal paid = debtService.paidOf(d);
            if (m.getAmount().compareTo(paid) < 0) {
                throw new IllegalArgumentException(m.getName().trim() + " คืนมาแล้ว " + paid.toPlainString()
                        + " บาท ยอดต้องไม่น้อยกว่านี้");
            }
            keep.add(d.getDebtId());
        }
        List<Debt> removed = new ArrayList<>();
        for (Debt d : existing.values()) {
            if (!keep.contains(d.getDebtId())) {
                if (debtService.paidOf(d).signum() > 0) {
                    throw new IllegalArgumentException(d.getCreditorName()
                            + " คืนเงินมาแล้ว เอาออกจากบิลไม่ได้ (ยกเลิกรายการรับเงินของคนนี้ก่อน)");
                }
                removed.add(d);
            }
        }

        // บันทึกบิลก่อน (รายละเอียดรายรับเงินคืนใช้ชื่อบิลใหม่)
        applyGroupFields(g, req, v);
        g = groupRepository.save(g);

        for (Debt d : removed) {
            d.setDeleted(true);
            debtRepository.save(d);
        }
        for (BillRequest.Member m : req.getMembers()) {
            if (m.getDebtId() == null) {
                newMember(g, m);
                continue;
            }
            Debt d = existing.get(m.getDebtId());
            d.setCreditorName(m.getName().trim());
            d.setTotalAmount(m.getAmount());
            d.setBorrowDate(g.getBillDate());
            debtService.refreshStatusOf(d);
            debtRepository.save(d);
            debtService.refreshPaymentDescriptions(d);
        }

        syncExpense(g, req);

        DebtGroup saved = g;
        return listBills(req.getUserId()).stream()
                .filter(r -> r.getGroupId().equals(saved.getGroupId()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("ไม่พบบิล"));
    }

    // ลบบิล (soft delete) — รายจ่ายยอดเต็มและเงินที่ได้คืนแล้วยังอยู่ในประวัติธุรกรรม
    @Transactional
    public void deleteBill(BillRequest req) {
        DebtGroup g = loadGroup(req.getGroupId(), req.getUserId());
        for (Debt d : debtRepository.findActiveByGroupIds(List.of(g.getGroupId()))) {
            d.setDeleted(true);
            debtRepository.save(d);
        }
        g.setDeleted(true);
        groupRepository.save(g);
    }

    // ---------- helpers ----------

    // ผลตรวจข้อมูลบิล
    private record Validated(String title, BigDecimal total, LocalDate billDate, boolean includeSelf, BigDecimal selfShare) {
    }

    private Validated validate(BillRequest req) {
        String title = req.getTitle() != null ? req.getTitle().trim() : "";
        if (title.isEmpty()) {
            throw new IllegalArgumentException("กรุณาตั้งชื่อบิล");
        }
        if (title.length() > 100) {
            throw new IllegalArgumentException("ชื่อบิลยาวเกิน 100 ตัวอักษร");
        }
        BigDecimal total = req.getTotalAmount();
        if (total == null || total.signum() <= 0) {
            throw new IllegalArgumentException("ยอดบิลต้องมากกว่า 0");
        }
        List<BillRequest.Member> members = req.getMembers() != null ? req.getMembers() : List.of();
        if (members.isEmpty()) {
            throw new IllegalArgumentException("เพิ่มคนที่ต้องคืนเงินอย่างน้อย 1 คน");
        }
        BigDecimal sum = BigDecimal.ZERO;
        for (BillRequest.Member m : members) {
            if (m.getName() == null || m.getName().isBlank()) {
                throw new IllegalArgumentException("กรอกชื่อให้ครบทุกคน");
            }
            if (m.getName().trim().length() > 100) {
                throw new IllegalArgumentException("ชื่อยาวเกิน 100 ตัวอักษร");
            }
            if (m.getAmount() == null || m.getAmount().signum() <= 0) {
                throw new IllegalArgumentException("ยอดของ " + m.getName().trim() + " ต้องมากกว่า 0");
            }
            sum = sum.add(m.getAmount());
        }
        boolean includeSelf = !Boolean.FALSE.equals(req.getIncludeSelf());
        BigDecimal selfShare = total.subtract(sum);
        if (selfShare.signum() < 0) {
            throw new IllegalArgumentException("ยอดที่ทวงรวมกันเกินยอดบิล");
        }
        if (!includeSelf && selfShare.signum() != 0) {
            throw new IllegalArgumentException("ยอดที่ทวงรวมกันต้องเท่ากับยอดบิล (ไม่ได้นับเราในการหาร)");
        }
        LocalDate billDate = req.getBillDate() != null ? req.getBillDate() : LocalDate.now();
        if (billDate.isAfter(LocalDate.now())) {
            throw new IllegalArgumentException("วันที่ของบิลต้องไม่เกินวันนี้");
        }
        return new Validated(title, total, billDate, includeSelf, selfShare);
    }

    private void applyGroupFields(DebtGroup g, BillRequest req, Validated v) {
        g.setTitle(v.title());
        g.setNote(req.getNote() != null && !req.getNote().isBlank() ? req.getNote().trim() : null);
        g.setTotalAmount(v.total());
        g.setBillDate(v.billDate());
        g.setIncludeSelf(v.includeSelf());
        g.setSelfShare(v.selfShare());
    }

    private Debt newMember(DebtGroup g, BillRequest.Member m) {
        Debt d = new Debt();
        d.setUserId(g.getUserId());
        d.setDirection(Debt.RECEIVABLE);
        d.setGroupId(g.getGroupId());
        d.setCreditorName(m.getName().trim());
        d.setTotalAmount(m.getAmount());
        d.setBorrowDate(g.getBillDate());
        d.setStatus(Debt.ACTIVE);
        d.setCreatedAt(LocalDateTime.now());
        return debtRepository.save(d);
    }

    // รายจ่ายยอดเต็มให้ตรงกับบิล: เปิด = สร้าง/แก้ตาม · ปิด = ลบรายจ่ายที่ระบบลงไว้
    private void syncExpense(DebtGroup g, BillRequest req) {
        Transaction txn = g.getTransactionId() != null
                ? transactionRepository.findById(g.getTransactionId()).filter(t -> !t.isDeleted()).orElse(null)
                : null;
        boolean record = Boolean.TRUE.equals(req.getRecordExpense());
        if (record && txn != null) {
            transactionService.updateSavingsTransaction(txn.getId(), req.getCategoryId(), g.getTotalAmount(),
                    expenseDate(g.getBillDate(), txn.getTransactionDate()), expenseDescription(g));
        } else if (record) {
            Transaction created = transactionService.createLinkedExpense(g.getUserId(), req.getCategoryId(),
                    g.getTotalAmount(), expenseDate(g.getBillDate(), null), expenseDescription(g));
            g.setTransactionId(created.getId());
            groupRepository.save(g);
        } else {
            if (txn != null) {
                transactionService.cancelLinkedTransaction(txn.getId());
            }
            g.setTransactionId(null);
            groupRepository.save(g);
        }
    }

    // วันที่ของรายจ่าย: วันเดิมคงเวลาเดิม · วันนี้ใช้เวลาตอนนี้ · วันอื่นใช้เที่ยงวัน
    private LocalDateTime expenseDate(LocalDate billDate, LocalDateTime current) {
        if (current != null && current.toLocalDate().equals(billDate)) {
            return current;
        }
        return billDate.equals(LocalDate.now()) ? LocalDateTime.now() : billDate.atTime(12, 0);
    }

    private String expenseDescription(DebtGroup g) {
        return "หารบิล: " + g.getTitle();
    }

    private DebtGroup loadGroup(Long groupId, Long userId) {
        requireUser(userId);
        if (groupId == null) {
            throw new IllegalArgumentException("ไม่พบรหัสบิล");
        }
        DebtGroup g = groupRepository.findActiveById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("ไม่พบบิล"));
        if (!userId.equals(g.getUserId())) {
            throw new IllegalArgumentException("ไม่มีสิทธิ์จัดการบิลนี้");
        }
        return g;
    }

    private BillResponse toResponse(DebtGroup g, List<DebtResponse> members, Transaction txn) {
        BillResponse r = new BillResponse();
        r.setGroupId(g.getGroupId());
        r.setTitle(g.getTitle());
        r.setNote(g.getNote());
        r.setTotalAmount(g.getTotalAmount());
        r.setBillDate(g.getBillDate());
        r.setIncludeSelf(g.isIncludeSelf());
        r.setSelfShare(g.getSelfShare());
        r.setCreatedAt(g.getCreatedAt());
        // รายจ่ายที่ถูกลบไปแล้ว ไม่ต้องแสดง
        if (txn != null && !txn.isDeleted()) {
            r.setTransactionId(txn.getId());
            Categories c = txn.getCategoryId();
            if (c != null) {
                r.setCategoryId(c.getId());
                r.setCategoryName(c.getName());
                r.setCategoryIcon(c.getIcon());
            }
        }

        BigDecimal toCollect = BigDecimal.ZERO;
        BigDecimal collected = BigDecimal.ZERO;
        int paidCount = 0;
        for (DebtResponse m : members) {
            toCollect = toCollect.add(m.getTotalAmount());
            collected = collected.add(m.getPaidAmount());
            if (Debt.PAID.equals(m.getStatus())) {
                paidCount++;
            }
        }
        r.setToCollect(toCollect);
        r.setCollected(collected);
        r.setRemaining(toCollect.subtract(collected).max(BigDecimal.ZERO));
        r.setMemberCount(members.size());
        r.setPaidCount(paidCount);
        r.setMembers(members);
        return r;
    }

    private void requireUser(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("ไม่พบผู้ใช้");
        }
    }
}
