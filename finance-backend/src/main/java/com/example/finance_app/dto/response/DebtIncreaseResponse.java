package com.example.finance_app.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import lombok.Data;

@Data
public class DebtIncreaseResponse {
    private Long debtIncreaseId;
    private Long debtId;
    private BigDecimal amount;
    private LocalDateTime increaseDate;
    private String note;
    private Long transactionId;
}
