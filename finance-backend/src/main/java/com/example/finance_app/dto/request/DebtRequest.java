package com.example.finance_app.dto.request;

import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.Data;

// สร้าง / แก้ไข / ลบ รายการหนี้
@Data
public class DebtRequest {
    private Long debtId; // ใช้ตอนแก้ไข/ลบ
    private Long userId;
    private String creditorName;
    private String description;
    private BigDecimal totalAmount;
    private LocalDate borrowDate; // null = วันนี้
    private LocalDate dueDate;    // ไม่บังคับ
}
