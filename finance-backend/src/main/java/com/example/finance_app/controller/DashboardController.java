package com.example.finance_app.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.finance_app.dto.request.DashboardRequest;
import com.example.finance_app.service.DashboardService;

@RestController
@RequestMapping("/finance-app")
@CrossOrigin(origins = "*")
public class DashboardController {

    @Autowired
    private DashboardService dashboardService;

    // สรุปข้อมูลหน้า dashboard ของเดือนที่เลือก (KPI + รายจ่ายแยกหมวด + ค่างวดเดือนนี้)
    @PostMapping("/dashboard/summary")
    public ResponseEntity<?> getSummary(@RequestBody DashboardRequest req) {
        try {
            return ResponseEntity.ok(dashboardService.getSummary(req));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        }
    }
}
