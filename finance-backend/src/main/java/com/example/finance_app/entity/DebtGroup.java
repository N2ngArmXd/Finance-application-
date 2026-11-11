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

// บิลหาร (เราออกเงินก่อน แล้วทวงคืนจากเพื่อน) — แต่ละคนที่ต้องคืนคือ Debt ทิศ RECEIVABLE ที่ group_id ชี้มาที่นี่
// ดู BillSplitService
@Data
@Entity
@Table(name = "debt_group", schema = "finance-app")
public class DebtGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "group_id")
    private Long groupId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "title", length = 100, nullable = false)
    private String title;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    // ยอดบิลทั้งหมดที่เราจ่ายไป
    @Column(name = "total_amount", precision = 15, scale = 2, nullable = false)
    private BigDecimal totalAmount;

    @Column(name = "bill_date", nullable = false)
    private LocalDate billDate;

    // นับตัวเราในการหารด้วยไหม
    @Column(name = "include_self", nullable = false)
    private boolean includeSelf = true;

    // ส่วนของเราเอง = ยอดบิล − ยอดที่ต้องทวงทุกคน
    @Column(name = "self_share", precision = 15, scale = 2, nullable = false)
    private BigDecimal selfShare = BigDecimal.ZERO;

    // รายจ่ายยอดเต็มที่ระบบลงให้ตอนสร้างบิล (null = ไม่ได้ลง)
    @Column(name = "transaction_id")
    private Long transactionId;

    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
