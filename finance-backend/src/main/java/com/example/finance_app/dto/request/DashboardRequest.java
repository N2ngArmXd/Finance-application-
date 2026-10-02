package com.example.finance_app.dto.request;

import lombok.Data;

// คำขอข้อมูลหน้า dashboard ของเดือนที่เลือก
@Data
public class DashboardRequest {
    private Long userId;
    private String month; // yyyy-MM เช่น 2026-10 ; null = เดือนปัจจุบัน
}
