package com.example.finance_app.dto.request;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import lombok.Data;

// ฝาก / ถอน / แก้ไข / ลบ รายการเงินออม + ดึงประวัติแบบแบ่งหน้า
@Data
public class SavingsMovementRequest {
    private Long savingsMovementId; // ใช้ตอนแก้ไข/ลบ
    private Long savingsGoalId;
    private Long userId;
    private BigDecimal amount;
    private LocalDateTime movementDate; // null = ตอนนี้
    private String note;

    // ถอน: TO_WALLET (กลับเข้ากระเป๋า) | SPEND (ใช้จ่ายเลย -> สร้างรายจ่าย)
    private String mode;
    private Long categoryId; // บังคับเมื่อ mode = SPEND

    // ประวัติ (เริ่มที่ 1)
    private Integer page;
    private Integer size;
}
