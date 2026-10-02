package com.example.finance_app.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

// รายการฝาก/ถอนของกระปุก — amount เป็นบวกเสมอ ทิศทางดูจาก type
@Data
@Entity
@Table(name = "savings_movement", schema = "finance-app")
public class SavingsMovement {

    public static final String DEPOSIT = "DEPOSIT";
    public static final String WITHDRAW = "WITHDRAW";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "savings_movement_id")
    private Long savingsMovementId;

    @Column(name = "savings_goal_id", nullable = false)
    private Long savingsGoalId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    // DEPOSIT | WITHDRAW
    @Column(name = "type", length = 20, nullable = false)
    private String type;

    @Column(name = "amount", precision = 15, scale = 2, nullable = false)
    private BigDecimal amount;

    @Column(name = "movement_date", nullable = false)
    private LocalDateTime movementDate;

    @Column(name = "note")
    private String note;

    // ถอนไปใช้ (SPEND) -> รายจ่ายที่ระบบสร้าง ; null = ฝาก หรือถอนกลับเข้ากระเป๋า
    @Column(name = "transaction_id")
    private Long transactionId;

    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // ผลต่อยอดในกระปุก: ฝาก = +amount, ถอน = -amount
    public BigDecimal signedAmount() {
        return DEPOSIT.equals(type) ? amount : amount.negate();
    }
}
