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

// กระปุกเงินออม — ยอดในกระปุกคำนวณจาก savings_movement (ไม่เก็บซ้ำ) ดู db/2026-10-02_savings_goals.sql
@Data
@Entity
@Table(name = "savings_goal", schema = "finance-app")
public class SavingsGoal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "savings_goal_id")
    private Long savingsGoalId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    // null = ไม่กำหนดเป้า (เก็บไปเรื่อย ๆ)
    @Column(name = "target_amount", precision = 15, scale = 2)
    private BigDecimal targetAmount;

    @Column(name = "target_date")
    private LocalDate targetDate;

    @Column(name = "icon", length = 50)
    private String icon;

    @Column(name = "color", length = 30)
    private String color;

    // ACTIVE | ARCHIVED (ปิดกระปุก — ทำได้เมื่อยอดเป็น 0)
    @Column(name = "status", length = 20, nullable = false)
    private String status = "ACTIVE";

    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "archived_at")
    private LocalDateTime archivedAt;
}
