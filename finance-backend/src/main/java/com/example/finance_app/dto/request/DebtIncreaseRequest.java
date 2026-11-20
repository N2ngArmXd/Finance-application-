package com.example.finance_app.dto.request;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import lombok.Data;

// เพิ่มยอดหนี้ / แก้ไข / ลบ + ดึงประวัติการเพิ่มยอดของหนี้
@Data
public class DebtIncreaseRequest {
    private Long debtIncreaseId; // ใช้ตอนแก้ไข/ลบ
    private Long debtId;
    private Long userId;
    private BigDecimal amount;
    private LocalDateTime increaseDate; // null = ตอนนี้
    private String note;
}
