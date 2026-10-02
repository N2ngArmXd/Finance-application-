package com.example.finance_app.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import lombok.Data;

// กระปุก + ยอดที่คำนวณแล้ว
@Data
public class SavingsGoalResponse {
    private Long savingsGoalId;
    private String name;
    private String description;
    private BigDecimal targetAmount;
    private LocalDate targetDate;
    private String icon;
    private String color;
    private String status; // ACTIVE | ARCHIVED
    private LocalDateTime createdAt;
    private LocalDateTime archivedAt;

    private BigDecimal balance = BigDecimal.ZERO; // ยอดในกระปุก
    private BigDecimal depositedThisMonth = BigDecimal.ZERO;
    private BigDecimal progress; // 0..1+ (null = ไม่มีเป้า)
    private boolean reached; // ถึงเป้าแล้ว
    private boolean overdue; // เลยวันที่เป้าแต่ยังไม่ถึงเป้า
    private BigDecimal suggestedMonthly; // (เป้า − ยอด) ÷ เดือนที่เหลือ (null = ไม่มีเป้า/วันที่ หรือถึงเป้าแล้ว)
}
