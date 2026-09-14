package com.example.finance_app.entity;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "installments", schema = "finance-app")
public class InstallmentsEntity {

    // id สร้างเองแบบ 14 หลัก: วิธีคิด(1) + DDMMYY(6) + สุ่ม(7) — ดู FinanceService
    @Id
    @Column(name = "installments_id")
    private Long installmentsId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "installments_name", nullable = false)
    private String installmentsName;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "total_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "interest_type", length = 20)
    private String interestType;

    // วิธีคิดดอกเบี้ย: FLAT (คงที่) หรือ EFFECTIVE (ลดต้นลดดอก)
    @Column(name = "calculation_method", length = 20)
    private String calculationMethod = "FLAT";

    @Column(name = "interest_rate", precision = 5, scale = 2)
    private BigDecimal interestRate;

    @Column(name = "installment_months", nullable = false)
    private Integer installmentMonths;

    @Column(name = "monthly_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal monthlyAmount;

    @Column(name = "status", length = 50)
    private String status = "ACTIVE";

    // งวดที่ผู้ใช้กดยืนยันว่าจ่ายแล้ว เก็บเป็นเลขงวดคั่นด้วยจุลภาค เช่น "1,2,3"
    @Column(name = "paid_periods", columnDefinition = "TEXT")
    private String paidPeriods;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // Generate Getters and Setters here
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

    public BigDecimal getInterestRate() {
        return interestRate;
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

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getPaidPeriods() {
        return paidPeriods;
    }

    public void setPaidPeriods(String paidPeriods) {
        this.paidPeriods = paidPeriods;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

}
