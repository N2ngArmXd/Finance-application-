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
    private String categoryIcon;
    private Long categoryId;

    // รายจ่ายจากการถอนเงินออมไปใช้ (null = บันทึกเอง) — หน้าประวัติแสดง badge และห้ามแก้/ลบ
    private Long savingsMovementId;
    private Long savingsGoalId;
    private String savingsGoalName;

    // รายจ่ายจากการชำระหนี้ (null = บันทึกเอง) — debtLocked = หนี้ยังอยู่ ห้ามแก้/ลบจากหน้าประวัติ
    private Long debtPaymentId;
    private Long debtId;
    private String debtName;
    private boolean debtLocked;

    public Long getDebtPaymentId() {
        return debtPaymentId;
    }

    public void setDebtPaymentId(Long debtPaymentId) {
        this.debtPaymentId = debtPaymentId;
    }

    public Long getDebtId() {
        return debtId;
    }

    public void setDebtId(Long debtId) {
        this.debtId = debtId;
    }

    public String getDebtName() {
        return debtName;
    }

    public void setDebtName(String debtName) {
        this.debtName = debtName;
    }

    public boolean isDebtLocked() {
        return debtLocked;
    }

    public void setDebtLocked(boolean debtLocked) {
        this.debtLocked = debtLocked;
    }

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

    public String getCategoryIcon() {
        return categoryIcon;
    }

    public void setCategoryIcon(String categoryIcon) {
        this.categoryIcon = categoryIcon;
    }

    public Long getCategoryId() {
        return categoryId;
    }

    public void setCategoryId(Long categoryId) {
        this.categoryId = categoryId;
    }

    public Long getSavingsMovementId() {
        return savingsMovementId;
    }

    public void setSavingsMovementId(Long savingsMovementId) {
        this.savingsMovementId = savingsMovementId;
    }

    public Long getSavingsGoalId() {
        return savingsGoalId;
    }

    public void setSavingsGoalId(Long savingsGoalId) {
        this.savingsGoalId = savingsGoalId;
    }

    public String getSavingsGoalName() {
        return savingsGoalName;
    }

    public void setSavingsGoalName(String savingsGoalName) {
        this.savingsGoalName = savingsGoalName;
    }

}
