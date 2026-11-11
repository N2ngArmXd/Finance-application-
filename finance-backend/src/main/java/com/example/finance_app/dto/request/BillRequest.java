package com.example.finance_app.dto.request;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import lombok.Data;

// สร้าง / แก้ไข / ลบ บิลหาร (เราออกก่อน แล้วทวงคืนจากเพื่อน)
@Data
public class BillRequest {
    private Long groupId; // ใช้ตอนแก้ไข/ลบ
    private Long userId;
    private String title;
    private String note;
    private BigDecimal totalAmount;
    private LocalDate billDate;    // null = วันนี้
    private Boolean includeSelf;   // null = true (นับเราด้วย)
    private Boolean recordExpense; // ลงรายจ่ายยอดเต็มให้ด้วย
    private Long categoryId;       // หมวดรายจ่าย (บังคับเมื่อ recordExpense)
    private List<Member> members;

    // คนที่ต้องคืน + ยอดของคนนั้น (หน้าเว็บหารให้ แก้รายคนได้)
    @Data
    public static class Member {
        private Long debtId; // ตอนแก้บิล: คนเดิม = debtId ของคนนั้น · คนใหม่ = null
        private String name;
        private BigDecimal amount;
    }
}
