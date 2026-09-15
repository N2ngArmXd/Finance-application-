package com.example.finance_app.dto.response;

import java.math.BigDecimal;
import java.util.List;

// ผลลัพธ์แบบแบ่งหน้า + ยอดสรุปของทั้งชุดที่กรองแล้ว
public class TransactionPageResponse {
    private List<TransactionListResponse> content;
    private int page; // หน้าปัจจุบัน (เริ่มที่ 1)
    private int size;
    private long totalElements;
    private int totalPages;

    // ยอดสรุปคำนวณจากทั้งชุดที่ตรงเงื่อนไข (ไม่ใช่เฉพาะหน้านี้)
    private BigDecimal totalIncome;
    private BigDecimal totalExpense;

    public TransactionPageResponse() {
    }

    public TransactionPageResponse(List<TransactionListResponse> content, int page, int size, long totalElements,
            int totalPages, BigDecimal totalIncome, BigDecimal totalExpense) {
        this.content = content;
        this.page = page;
        this.size = size;
        this.totalElements = totalElements;
        this.totalPages = totalPages;
        this.totalIncome = totalIncome;
        this.totalExpense = totalExpense;
    }

    public List<TransactionListResponse> getContent() {
        return content;
    }

    public void setContent(List<TransactionListResponse> content) {
        this.content = content;
    }

    public int getPage() {
        return page;
    }

    public void setPage(int page) {
        this.page = page;
    }

    public int getSize() {
        return size;
    }

    public void setSize(int size) {
        this.size = size;
    }

    public long getTotalElements() {
        return totalElements;
    }

    public void setTotalElements(long totalElements) {
        this.totalElements = totalElements;
    }

    public int getTotalPages() {
        return totalPages;
    }

    public void setTotalPages(int totalPages) {
        this.totalPages = totalPages;
    }

    public BigDecimal getTotalIncome() {
        return totalIncome;
    }

    public void setTotalIncome(BigDecimal totalIncome) {
        this.totalIncome = totalIncome;
    }

    public BigDecimal getTotalExpense() {
        return totalExpense;
    }

    public void setTotalExpense(BigDecimal totalExpense) {
        this.totalExpense = totalExpense;
    }
}
