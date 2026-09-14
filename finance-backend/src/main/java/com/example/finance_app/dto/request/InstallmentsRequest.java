package com.example.finance_app.dto.request;

import java.math.BigDecimal;
import java.time.LocalDate;

public class InstallmentsRequest {

    private Long installmentsId;
    private Long userId;
    private String installmentsName;
    private String description;
    private BigDecimal totalAmount;
    private String interestType;
    private String calculationMethod;
    private BigDecimal interestRate;
    private Integer installmentMonths;
    private BigDecimal monthlyAmount;
    private LocalDate startDate;
    private LocalDate createdAt;

    public Long getInstallmentsId() {
        return installmentsId;
    }

    public void setInstallmentsId(Long installmentsId) {
        this.installmentsId = installmentsId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getInstallmentsName() {
        return installmentsName;
    }

    public void setInstallmentsName(String installmentsName) {
        this.installmentsName = installmentsName;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }

    public BigDecimal getInterestRate() {
        return interestRate;
    }

    public String getInterestType() {
        return interestType;
    }

    public void setInterestType(String interestType) {
        this.interestType = interestType;
    }

    public String getCalculationMethod() {
        return calculationMethod;
    }

    public void setCalculationMethod(String calculationMethod) {
        this.calculationMethod = calculationMethod;
    }

    public void setInterestRate(BigDecimal interestRate) {
        this.interestRate = interestRate;
    }

    public Integer getInstallmentMonths() {
        return installmentMonths;
    }

    public void setInstallmentMonths(Integer installmentMonths) {
        this.installmentMonths = installmentMonths;
    }

    public BigDecimal getMonthlyAmount() {
        return monthlyAmount;
    }

    public void setMonthlyAmount(BigDecimal monthlyAmount) {
        this.monthlyAmount = monthlyAmount;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDate createdAt) {
        this.createdAt = createdAt;
    }

}
