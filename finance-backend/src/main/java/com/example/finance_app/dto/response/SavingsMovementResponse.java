package com.example.finance_app.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import lombok.Data;

@Data
public class SavingsMovementResponse {
    private Long savingsMovementId;
    private Long savingsGoalId;
    private String type; // DEPOSIT | WITHDRAW
    private String mode; // DEPOSIT | TO_WALLET | SPEND
    private BigDecimal amount;
    private LocalDateTime movementDate;
    private String note;

    // เฉพาะ SPEND: รายจ่ายที่ระบบสร้าง
    private Long transactionId;
    private Long categoryId;
    private String categoryName;
    private String categoryIcon;
}
