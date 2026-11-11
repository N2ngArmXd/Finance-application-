package com.example.finance_app.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

// รายการหนี้ที่ติดคนอื่น (ติดตามหนี้) — ตอนสร้างไม่บันทึกเป็นรายรับ
// ยอดที่จ่ายแล้วคิดจาก debt_payment · ดู DebtService
@Data
@Entity
@Table(name = "debt", schema = "finance-app")
public class Debt {

    public static final String ACTIVE = "ACTIVE";
    public static final String PAID = "PAID";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "debt_id")
    private Long debtId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    // ติดหนี้ใคร (เจ้าหนี้)
    @Column(name = "creditor_name", length = 100, nullable = false)
    private String creditorName;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "total_amount", precision = 15, scale = 2, nullable = false)
    private BigDecimal totalAmount;

    // วันที่ยืม / เริ่มเป็นหนี้
    @Column(name = "borrow_date", nullable = false)
    private LocalDate borrowDate;

    // กำหนดคืน (ไม่บังคับ)
    @Column(name = "due_date")
    private LocalDate dueDate;

    // ACTIVE (ยังจ่ายไม่ครบ) | PAID (ชำระครบ) — คำนวณใหม่ทุกครั้งที่ยอดจ่าย/ยอดหนี้เปลี่ยน
    @Column(name = "status", length = 20, nullable = false)
    private String status = ACTIVE;

    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // วันเวลาที่ชำระครบ (null = ยังไม่ครบ)
    @Column(name = "paid_off_at")
    private LocalDateTime paidOffAt;
}
