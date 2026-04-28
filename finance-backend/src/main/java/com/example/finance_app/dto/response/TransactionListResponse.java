package com.example.finance_app.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import lombok.NoArgsConstructor;

@NoArgsConstructor
public class TransactionListResponse {
    private Long id;
    private BigDecimal amount;
    private String description;
    private LocalDateTime transactionDate;

    private String categoryName;
    private String categoryType;
    private Long categoryId;

    public TransactionListResponse(Long id, BigDecimal amount, String description, LocalDateTime transactionDate,
            String categoryName, String categoryType, Long categoryId) {
        this.id = id;
        this.amount = amount;
        this.description = description;
        this.transactionDate = transactionDate;
        this.categoryName = categoryName;
        this.categoryType = categoryType;
        this.categoryId = categoryId;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDateTime getTransactionDate() {
        return transactionDate;
    }

    public void setTransactionDate(LocalDateTime transactionDate) {
        this.transactionDate = transactionDate;
    }

    public String getCategoryName() {
        return categoryName;
    }

    public void setCategoryName(String categoryName) {
        this.categoryName = categoryName;
    }

    public String getCategoryType() {
        return categoryType;
    }

    public void setCategoryType(String categoryType) {
        this.categoryType = categoryType;
    }

    public Long getCategoryId() {
        return categoryId;
    }

    public void setCategoryId(Long categoryId) {
        this.categoryId = categoryId;
    }

}
