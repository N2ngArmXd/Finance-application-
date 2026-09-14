package com.example.finance_app.entity;

import java.time.LocalDateTime;
import java.math.BigDecimal;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;

import jakarta.persistence.Table;
import lombok.Data;

@Data
@Entity
@Table(name = "transactions", schema = "\"finance-app\"")
public class Transaction {
    // id สร้างเองแบบ 14 หลัก: ประเภท(1) + DDMMYY(6) + สุ่ม(7) — ดู FinanceService
    @Id
    private Long id;

    @Column(name = "amount")
    private BigDecimal amount;

    @Column(name = "description")
    private String description;

    @Column(name = "transaction_date")
    private LocalDateTime transactionDate;

    @Column(name = "is_deleted")
    private boolean isDeleted = false;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private Users userId;

    @ManyToOne
    @JoinColumn(name = "category_id")
    private Categories categoryId;

}
