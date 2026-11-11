package com.example.finance_app.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import lombok.Data;

@Data
public class BillResponse {
    private Long groupId;
    private String title;
    private String note;
    private BigDecimal totalAmount;
    private LocalDate billDate;
    private boolean includeSelf;
    private BigDecimal selfShare;
    private LocalDateTime createdAt;

    // รายจ่ายยอดเต็มที่ระบบลงให้ (null = ไม่ได้ลง)
    private Long transactionId;
    private Long categoryId;
    private String categoryName;
    private String categoryIcon;

    private BigDecimal toCollect;  // ยอดที่ต้องทวงทั้งหมด
    private BigDecimal collected;  // ได้คืนแล้ว
    private BigDecimal remaining;  // ยังค้าง
    private int memberCount;
    private int paidCount;         // คนที่คืนครบแล้ว
    private List<DebtResponse> members = new ArrayList<>();
}
