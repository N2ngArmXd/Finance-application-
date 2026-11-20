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

// การเพิ่มยอดหนี้แต่ละครั้ง (ติดหนี้เพิ่ม) — บวกเข้า debt.total_amount ตรงๆ
// ทุกรายการสร้าง transaction หมวด "เพิ่มยอดหนี้" (DEBT_ADD) คู่กัน ไว้ดูที่มาในประวัติ — ไม่นับเป็นรายรับ/รายจ่าย
@Data
@Entity
@Table(name = "debt_increase", schema = "finance-app")
public class DebtIncrease {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "debt_increase_id")
    private Long debtIncreaseId;

    @Column(name = "debt_id", nullable = false)
    private Long debtId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "amount", precision = 15, scale = 2, nullable = false)
    private BigDecimal amount;

    @Column(name = "increase_date", nullable = false)
    private LocalDateTime increaseDate;

    // ที่มาของยอดที่เพิ่ม (บังคับกรอก)
    @Column(name = "note")
    private String note;

    // transaction หมวด "เพิ่มยอดหนี้" ที่ระบบสร้างคู่กัน
    @Column(name = "transaction_id")
    private Long transactionId;

    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
