package com.example.finance_app.controller;

import java.util.function.Supplier;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.finance_app.dto.request.BillRequest;
import com.example.finance_app.dto.request.DebtPaymentRequest;
import com.example.finance_app.dto.request.DebtRequest;
import com.example.finance_app.security.CurrentUser;
import com.example.finance_app.service.BillSplitService;
import com.example.finance_app.service.DebtService;

// ติดตามหนี้ (รายการหนี้ + ชำระ) — error ทางธุรกิจตอบ 400 พร้อมข้อความภาษาไทย
@RestController
@RequestMapping("/finance-app")
@CrossOrigin(origins = "*")
public class DebtController {

    @Autowired
    private DebtService debtService;
    @Autowired
    private BillSplitService billSplitService;

    @PostMapping("/debts/list")
    public ResponseEntity<?> listDebts(@CurrentUser Long userId) {
        return handle(() -> debtService.listDebts(userId));
    }

    @PostMapping("/debts/create")
    public ResponseEntity<?> createDebt(@RequestBody DebtRequest req, @CurrentUser Long userId) {
        req.setUserId(userId);
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(debtService.createDebt(req));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PostMapping("/debts/update")
    public ResponseEntity<?> updateDebt(@RequestBody DebtRequest req, @CurrentUser Long userId) {
        req.setUserId(userId);
        return handle(() -> debtService.updateDebt(req));
    }

    @PostMapping("/debts/delete")
    public ResponseEntity<?> deleteDebt(@RequestBody DebtRequest req, @CurrentUser Long userId) {
        req.setUserId(userId);
        return handle(() -> {
            debtService.deleteDebt(req);
            return "ลบรายการหนี้เรียบร้อยแล้ว";
        });
    }

    @PostMapping("/debts/payments")
    public ResponseEntity<?> listPayments(@RequestBody DebtPaymentRequest req, @CurrentUser Long userId) {
        req.setUserId(userId);
        return handle(() -> debtService.listPayments(req));
    }

    // ชำระหนี้ (แบ่งจ่ายได้) -> สร้างรายจ่ายหมวด "ชำระหนี้" อัตโนมัติ
    @PostMapping("/debts/pay")
    public ResponseEntity<?> pay(@RequestBody DebtPaymentRequest req, @CurrentUser Long userId) {
        req.setUserId(userId);
        return handle(() -> debtService.pay(req));
    }

    @PostMapping("/debts/payment/update")
    public ResponseEntity<?> updatePayment(@RequestBody DebtPaymentRequest req, @CurrentUser Long userId) {
        req.setUserId(userId);
        return handle(() -> debtService.updatePayment(req));
    }

    @PostMapping("/debts/payment/delete")
    public ResponseEntity<?> deletePayment(@RequestBody DebtPaymentRequest req, @CurrentUser Long userId) {
        req.setUserId(userId);
        return handle(() -> {
            debtService.deletePayment(req);
            return "ลบรายการชำระเรียบร้อยแล้ว";
        });
    }

    // ---------- บิลหาร (เขาติดหนี้เรา) — รับเงินคืนรายคนใช้ /debts/pay กับ debtId ของคนนั้น ----------

    @PostMapping("/debts/bills/list")
    public ResponseEntity<?> listBills(@CurrentUser Long userId) {
        return handle(() -> billSplitService.listBills(userId));
    }

    @PostMapping("/debts/bills/create")
    public ResponseEntity<?> createBill(@RequestBody BillRequest req, @CurrentUser Long userId) {
        req.setUserId(userId);
        try {
            return ResponseEntity.status(HttpStatus.CREATED).body(billSplitService.createBill(req));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }

    @PostMapping("/debts/bills/update")
    public ResponseEntity<?> updateBill(@RequestBody BillRequest req, @CurrentUser Long userId) {
        req.setUserId(userId);
        return handle(() -> billSplitService.updateBill(req));
    }

    @PostMapping("/debts/bills/delete")
    public ResponseEntity<?> deleteBill(@RequestBody BillRequest req, @CurrentUser Long userId) {
        req.setUserId(userId);
        return handle(() -> {
            billSplitService.deleteBill(req);
            return "ลบบิลเรียบร้อยแล้ว";
        });
    }

    private ResponseEntity<?> handle(Supplier<Object> action) {
        try {
            return ResponseEntity.ok(action.get());
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }
}
