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

// การชำระหนี้แต่ละครั้ง (แบ่งจ่ายได้) — ทุกรายการสร้างรายจ่ายหมวด "ชำระหนี้" คู่กันใน transactions
@Data
@Entity
@Table(name = "debt_payment", schema = "finance-app")
public class DebtPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "debt_payment_id")
    private Long debtPaymentId;

    @Column(name = "debt_id", nullable = false)
    private Long debtId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "amount", precision = 15, scale = 2, nullable = false)
    private BigDecimal amount;

    @Column(name = "payment_date", nullable = false)
    private LocalDateTime paymentDate;

    @Column(name = "note")
    private String note;

    // รายจ่ายที่ระบบสร้างคู่กัน
    @Column(name = "transaction_id")
    private Long transactionId;

    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
