package com.example.finance_app.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.finance_app.dto.request.InstallmentsRequest;
import com.example.finance_app.entity.InstallmentsEntity;
import com.example.finance_app.security.CurrentUser;
import com.example.finance_app.service.InstallmentService;

@RestController
@RequestMapping("/finance-app")
@CrossOrigin(origins = "*")
public class InstallmentController {

    @Autowired
    private InstallmentService installmentService;

    @PostMapping("/create/installments")
    public ResponseEntity<InstallmentsEntity> createInstallments(@RequestBody InstallmentsRequest request,
            @CurrentUser Long userId) {
        request.setUserId(userId);
        InstallmentsEntity installments = installmentService.createdInstallments(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(installments);
    }

    @PostMapping("/installments/list")
    public ResponseEntity<?> getInstallmentsList(@CurrentUser Long userId) {
        try {
            List<InstallmentsEntity> result = installmentService.getListInstallments(userId);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PostMapping("/installments/update")
    public ResponseEntity<?> updateInstallments(@RequestBody InstallmentsRequest request,
            @CurrentUser Long userId) {
        try {
            request.setUserId(userId);
            InstallmentsEntity result = installmentService.updateInstallments(request);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PostMapping("/installments/delete")
    public ResponseEntity<?> deleteInstallments(@RequestBody Map<String, Object> payload,
            @CurrentUser Long userId) {
        try {
            Long installmentsId = Long.valueOf(payload.get("installmentsId").toString());
            installmentService.softDeleteInstallments(installmentsId, userId);
            return ResponseEntity.ok("ลบรายการ (Soft Delete) เรียบร้อยแล้ว");
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PostMapping("/installments/pay-period")
    public ResponseEntity<?> payInstallmentPeriod(@RequestBody Map<String, Object> payload,
            @CurrentUser Long userId) {
        try {
            Long installmentsId = Long.valueOf(payload.get("installmentsId").toString());
            int period = Integer.parseInt(payload.get("period").toString());
            boolean paid = payload.get("paid") == null || Boolean.parseBoolean(payload.get("paid").toString());
            InstallmentsEntity result = installmentService.updatePaidPeriod(installmentsId, userId, period, paid);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    // ปิดยอดรายการผ่อน (status = CLOSED + log วันที่ปิด)
    @PostMapping("/installments/close")
    public ResponseEntity<?> closeInstallment(@RequestBody Map<String, Object> payload,
            @CurrentUser Long userId) {
        try {
            Long installmentsId = Long.valueOf(payload.get("installmentsId").toString());
            InstallmentsEntity result = installmentService.closeInstallment(installmentsId, userId);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }
}
