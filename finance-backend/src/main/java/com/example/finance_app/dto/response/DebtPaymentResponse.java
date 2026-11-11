package com.example.finance_app.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import lombok.Data;

@Data
public class DebtPaymentResponse {
    private Long debtPaymentId;
    private Long debtId;
    private BigDecimal amount;
    private LocalDateTime paymentDate;
    private String note;
    private Long transactionId;
}
