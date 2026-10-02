package com.example.finance_app.dto.request;

import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.Data;

// สร้าง/แก้ไข/ปิด/ลบกระปุก
@Data
public class SavingsGoalRequest {
    private Long savingsGoalId; // ใช้ตอนแก้ไข/ปิด/ลบ
    private Long userId;
    private String name;
    private String description;
    private BigDecimal targetAmount; // null = ไม่กำหนดเป้า
    private LocalDate targetDate;
    private String icon;
    private String color;

    // ตอนสร้าง: ฝากครั้งแรก (ไม่บังคับ)
    private BigDecimal initialDeposit;

    // ตอนปิดกระปุก: true = ถอนยอดที่เหลือทั้งหมดกลับเข้ากระเป๋าก่อนปิด
    private Boolean withdrawAll;
}
