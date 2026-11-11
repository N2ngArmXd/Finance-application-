package com.example.finance_app.dto.request;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import lombok.Data;

// ชำระหนี้ / แก้ไข / ลบ การชำระ + ดึงประวัติการชำระของหนี้
@Data
public class DebtPaymentRequest {
    private Long debtPaymentId; // ใช้ตอนแก้ไข/ลบ
    private Long debtId;
    private Long userId;
    private BigDecimal amount;
    private LocalDateTime paymentDate; // null = ตอนนี้
    private String note;
}
