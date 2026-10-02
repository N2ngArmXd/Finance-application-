package com.example.finance_app.dto.response;

import java.math.BigDecimal;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// ประวัติฝาก-ถอนของกระปุกแบบแบ่งหน้า + ยอดปัจจุบันของกระปุก
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SavingsMovementPageResponse {
    private List<SavingsMovementResponse> content;
    private int page; // เริ่มที่ 1
    private int size;
    private long totalElements;
    private int totalPages;
    private BigDecimal balance;
}
