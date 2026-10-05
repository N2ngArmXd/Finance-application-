package com.example.finance_app.service;

import java.util.Map;

/**
 * ข้อมูลที่ผู้ใช้กรอกไม่ผ่านการตรวจ — errors เป็น map ของ ชื่อฟิลด์ → ข้อความภาษาไทย
 * เพื่อให้หน้าบ้านแสดง error ใต้ช่องที่ผิดได้
 */
public class InputValidationException extends RuntimeException {

    private final Map<String, String> errors;

    public InputValidationException(Map<String, String> errors) {
        this(errors, "ข้อมูลไม่ถูกต้อง");
    }

    public InputValidationException(Map<String, String> errors, String message) {
        super(message);
        this.errors = errors;
    }

    public Map<String, String> getErrors() {
        return errors;
    }
}
