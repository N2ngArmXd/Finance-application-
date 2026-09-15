package com.example.finance_app.dto.request;

import java.time.LocalDate;

// คำขอค้นหา/กรอง/เรียง/แบ่งหน้า สำหรับหน้าประวัติธุรกรรม
public class TransactionSearchRequest {
    private Long userId;

    private String search; // ค้นหาจาก รายละเอียด / ชื่อหมวดหมู่ / รหัส
    private String type; // INCOME | EXPENSE | ALL/null = ทั้งหมด
    private Long categoryId; // null = ทุกหมวดหมู่

    private LocalDate dateFrom; // yyyy-MM-dd (นับรวมทั้งวัน)
    private LocalDate dateTo;

    private String sortBy; // transactionDate | amount
    private String sortDir; // asc | desc

    private Integer page; // เริ่มที่ 1
    private Integer size; // จำนวนต่อหน้า

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getSearch() {
        return search;
    }

    public void setSearch(String search) {
        this.search = search;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Long getCategoryId() {
        return categoryId;
    }

    public void setCategoryId(Long categoryId) {
        this.categoryId = categoryId;
    }

    public LocalDate getDateFrom() {
        return dateFrom;
    }

    public void setDateFrom(LocalDate dateFrom) {
        this.dateFrom = dateFrom;
    }

    public LocalDate getDateTo() {
        return dateTo;
    }

    public void setDateTo(LocalDate dateTo) {
        this.dateTo = dateTo;
    }

    public String getSortBy() {
        return sortBy;
    }

    public void setSortBy(String sortBy) {
        this.sortBy = sortBy;
    }

    public String getSortDir() {
        return sortDir;
    }

    public void setSortDir(String sortDir) {
        this.sortDir = sortDir;
    }

    public Integer getPage() {
        return page;
    }

    public void setPage(Integer page) {
        this.page = page;
    }

    public Integer getSize() {
        return size;
    }

    public void setSize(Integer size) {
        this.size = size;
    }
}
