package com.example.finance_app.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import lombok.Data;

@Data
public class DebtResponse {
    private Long debtId;
    private String creditorName;
    private String description;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private BigDecimal remaining;
    private BigDecimal progress; // 0..1
    private LocalDate borrowDate;
    private LocalDate dueDate;
    private String status;       // ACTIVE | PAID
    private boolean overdue;     // เลยกำหนดคืนแล้วแต่ยังจ่ายไม่ครบ
    private long paymentCount;
    private LocalDateTime lastPaymentDate;
    private LocalDateTime createdAt;
    private LocalDateTime paidOffAt;
}
