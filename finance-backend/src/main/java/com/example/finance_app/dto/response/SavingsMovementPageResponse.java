package com.example.finance_app.dto.response;

import java.math.BigDecimal;
import java.util.List;

import lombok.Data;
import lombok.NoArgsConstructor;

// ประวัติฝาก-ถอนของกระปุกแบบแบ่งหน้า + ยอดปัจจุบันของกระปุก
@Data
@NoArgsConstructor
public class SavingsMovementPageResponse {
    private List<SavingsMovementResponse> content;
    private int page; // เริ่มที่ 1
    private int size;
    private long totalElements;
    private int totalPages;
    private BigDecimal balance;

    public SavingsMovementPageResponse(List<SavingsMovementResponse> content, int page, int size,
            long totalElements, int totalPages, BigDecimal balance) {
        this.content = content;
        this.page = page;
        this.size = size;
        this.totalElements = totalElements;
        this.totalPages = totalPages;
        this.balance = balance;
    }
}
