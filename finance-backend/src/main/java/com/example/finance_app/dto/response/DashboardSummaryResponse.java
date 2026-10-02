package com.example.finance_app.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// ข้อมูลสรุปหน้า dashboard ของเดือนที่เลือก (รวมยอดจาก backend แล้ว)
@Data
public class DashboardSummaryResponse {
    private String month; // yyyy-MM

    // KPI ของเดือนนี้ + เดือนก่อน (ไว้คำนวณ % เปลี่ยนแปลง)
    private BigDecimal totalIncome = BigDecimal.ZERO;
    private BigDecimal totalExpense = BigDecimal.ZERO;
    private BigDecimal net = BigDecimal.ZERO;
    private BigDecimal prevIncome = BigDecimal.ZERO;
    private BigDecimal prevExpense = BigDecimal.ZERO;

    // รายจ่ายแยกหมวด เรียงจากมากไปน้อย
    private List<CategoryAmount> expenseByCategory = new ArrayList<>();

    // ค่างวดที่ครบกำหนดในเดือนนี้
    private BigDecimal installmentDueTotal = BigDecimal.ZERO;
    private BigDecimal installmentPaidTotal = BigDecimal.ZERO;
    // งวดของเดือนนี้ + งวดค้างชำระจากเดือนก่อน (overdue = true)
    private List<InstallmentDue> installmentsDue = new ArrayList<>();
    private BigDecimal installmentOverdueTotal = BigDecimal.ZERO;

    // งวดค้างของเดือนก่อน ๆ ที่มาจ่ายในเดือนนี้ (รวมอยู่ในรายจ่ายเดือนนี้แล้ว)
    private BigDecimal paidLateTotal = BigDecimal.ZERO;
    private int paidLateCount;

    // ค่างวดคงเหลือทั้งหมดของรายการที่ยังไม่ปิดยอด
    private BigDecimal totalDebtRemaining = BigDecimal.ZERO;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryAmount {
        private Long categoryId;
        private String categoryName;
        private String categoryIcon;
        private BigDecimal amount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InstallmentDue {
        private Long installmentsId;
        private String installmentsName;
        private int period; // งวดที่
        private int totalPeriods;
        private BigDecimal amount;
        private LocalDate dueDate;
        private boolean paid;
        private boolean overdue; // ครบกำหนดก่อนเดือนนี้และยังไม่จ่าย
    }
}
