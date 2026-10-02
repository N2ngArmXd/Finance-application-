package com.example.finance_app.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.finance_app.dto.request.DashboardRequest;
import com.example.finance_app.dto.response.DashboardSummaryResponse;
import com.example.finance_app.dto.response.DashboardSummaryResponse.CategoryAmount;
import com.example.finance_app.dto.response.DashboardSummaryResponse.InstallmentDue;
import com.example.finance_app.entity.InstallmentsEntity;
import com.example.finance_app.repository.InstallmentsRepository;
import com.example.finance_app.repository.TransactionRepository;

@Service
public class DashboardService {

    @Autowired
    private TransactionRepository transactionRepository;
    @Autowired
    private InstallmentsRepository installmentsRepository;

    public DashboardSummaryResponse getSummary(DashboardRequest req) {
        if (req.getUserId() == null) {
            throw new RuntimeException("ไม่พบผู้ใช้");
        }

        YearMonth month;
        try {
            month = (req.getMonth() != null && !req.getMonth().isBlank())
                    ? YearMonth.parse(req.getMonth())
                    : YearMonth.now();
        } catch (DateTimeParseException e) {
            throw new RuntimeException("รูปแบบเดือนไม่ถูกต้อง (ต้องเป็น yyyy-MM)");
        }

        Long userId = req.getUserId();
        DashboardSummaryResponse res = new DashboardSummaryResponse();
        res.setMonth(month.toString());

        // KPI เดือนนี้ และเดือนก่อน
        BigDecimal[] current = sumIncomeExpense(userId, month);
        BigDecimal[] previous = sumIncomeExpense(userId, month.minusMonths(1));
        res.setTotalIncome(current[0]);
        res.setTotalExpense(current[1]);
        res.setNet(current[0].subtract(current[1]));
        res.setPrevIncome(previous[0]);
        res.setPrevExpense(previous[1]);

        // รายจ่ายแยกหมวด
        for (Object[] row : transactionRepository.sumExpenseByCategory(
                userId, month.atDay(1).atStartOfDay(), month.plusMonths(1).atDay(1).atStartOfDay())) {
            res.getExpenseByCategory().add(new CategoryAmount(
                    (Long) row[0], (String) row[1], (String) row[2], toBigDecimal(row[3])));
        }

        fillInstallments(res, userId, month);
        return res;
    }

    // ยอดรวม [รายรับ, รายจ่าย] ของเดือน — ใช้ query ตัวเดียวกับหน้าประวัติ
    private BigDecimal[] sumIncomeExpense(Long userId, YearMonth month) {
        BigDecimal income = BigDecimal.ZERO;
        BigDecimal expense = BigDecimal.ZERO;
        for (Object[] row : transactionRepository.sumByType(userId, null, null, null,
                month.atDay(1).atStartOfDay(), month.atEndOfMonth().atTime(LocalTime.MAX))) {
            String type = (String) row[0];
            BigDecimal sum = toBigDecimal(row[1]);
            if ("INCOME".equalsIgnoreCase(type)) {
                income = income.add(sum);
            } else if ("EXPENSE".equalsIgnoreCase(type)) {
                expense = expense.add(sum);
            }
        }
        return new BigDecimal[] { income, expense };
    }

    // งวดผ่อนที่ครบกำหนดในเดือนที่เลือก + หนี้ค่างวดคงเหลือ
    private void fillInstallments(DashboardSummaryResponse res, Long userId, YearMonth month) {
        BigDecimal dueTotal = BigDecimal.ZERO;
        BigDecimal paidTotal = BigDecimal.ZERO;
        BigDecimal debtRemaining = BigDecimal.ZERO;

        for (InstallmentsEntity item : installmentsRepository.findByUserIdAndIsDeletedFalse(userId)) {
            int months = item.getInstallmentMonths() != null ? item.getInstallmentMonths() : 0;
            BigDecimal monthly = item.getMonthlyAmount() != null ? item.getMonthlyAmount() : BigDecimal.ZERO;
            Set<Integer> paid = parsePaidPeriods(item.getPaidPeriods());
            boolean closed = "CLOSED".equals(item.getStatus());

            if (!closed) {
                long unpaid = Math.max(months - paid.size(), 0);
                debtRemaining = debtRemaining.add(monthly.multiply(BigDecimal.valueOf(unpaid)));
            }

            for (int i = 1; i <= months; i++) {
                LocalDate dueDate = item.getStartDate().plusMonths(i - 1);
                if (!YearMonth.from(dueDate).equals(month)) {
                    continue;
                }
                boolean isPaid = paid.contains(i);
                // รายการที่ปิดยอดแล้ว แสดงเฉพาะงวดที่จ่ายจริง (ไม่นับเป็นยอดที่ต้องจ่าย)
                if (closed && !isPaid) {
                    continue;
                }
                res.getInstallmentsDue().add(new InstallmentDue(item.getInstallmentsId(),
                        item.getInstallmentsName(), i, months, monthly, dueDate, isPaid));
                dueTotal = dueTotal.add(monthly);
                if (isPaid) {
                    paidTotal = paidTotal.add(monthly);
                }
            }
        }

        // ยังไม่จ่ายขึ้นก่อน แล้วเรียงตามวันครบกำหนด
        res.getInstallmentsDue().sort(Comparator.comparing(InstallmentDue::isPaid)
                .thenComparing(InstallmentDue::getDueDate));
        res.setInstallmentDueTotal(dueTotal);
        res.setInstallmentPaidTotal(paidTotal);
        res.setTotalDebtRemaining(debtRemaining);
    }

    private Set<Integer> parsePaidPeriods(String paidPeriods) {
        Set<Integer> periods = new TreeSet<>();
        if (paidPeriods == null || paidPeriods.isBlank()) {
            return periods;
        }
        for (String part : paidPeriods.split(",")) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) {
                periods.add(Integer.parseInt(trimmed));
            }
        }
        return periods;
    }

    private BigDecimal toBigDecimal(Object value) {
        return value != null ? new BigDecimal(value.toString()) : BigDecimal.ZERO;
    }
}
