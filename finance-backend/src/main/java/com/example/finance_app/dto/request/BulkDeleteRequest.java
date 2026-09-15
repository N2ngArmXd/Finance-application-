package com.example.finance_app.dto.request;

import java.util.List;

// คำขอลบหลายรายการพร้อมกัน
public class BulkDeleteRequest {
    private Long userId;
    private List<Long> ids;

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public List<Long> getIds() {
        return ids;
    }

    public void setIds(List<Long> ids) {
        this.ids = ids;
    }
}
