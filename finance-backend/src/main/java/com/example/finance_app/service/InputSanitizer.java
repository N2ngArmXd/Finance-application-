package com.example.finance_app.service;

import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;

/**
 * ทำความสะอาดและตรวจรูปแบบข้อความที่ผู้ใช้กรอก ก่อนบันทึกลง DB
 * กติกาต้องตรงกับ src/utils/inputRules.js ฝั่งหน้าบ้าน
 *
 * แนวคิด: whitelist อักขระที่อนุญาตต่อฟิลด์ (ไม่ใช่ blacklist) เพื่อไม่ให้มีอักขระแปลกๆ
 * เช่น emoji, zero-width, < > ; ' " หลุดเข้า DB — ยกเว้นรหัสผ่านที่ต้องใช้อักขระพิเศษได้
 */
@Service
public class InputSanitizer {

    // อักษรไทย (พยัญชนะ สระ วรรณยุกต์) — ไม่รวม ฿ และเลขไทย
    private static final String THAI = "\\u0E01-\\u0E3A\\u0E40-\\u0E4E";

    public static final Pattern USERNAME = Pattern.compile("^[A-Za-z0-9_]{4,20}$");
    // ASCII ที่พิมพ์ได้ (ไม่มีช่องว่าง) 8–64 ตัว ต้องมีตัวอักษรและตัวเลขอย่างละตัว
    public static final Pattern PASSWORD = Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d)[\\x21-\\x7E]{8,64}$");
    public static final Pattern EMAIL = Pattern.compile("^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\\.[A-Za-z0-9-]+)*\\.[A-Za-z]{2,}$");
    public static final Pattern PERSON_NAME = Pattern.compile("^[" + THAI + "A-Za-z ]+$");
    public static final Pattern PHONE = Pattern.compile("^0\\d{9}$");
    public static final Pattern PLACE_NAME = Pattern.compile("^[" + THAI + "A-Za-z. ]+$");
    public static final Pattern ADDRESS_TEXT = Pattern.compile("^[" + THAI + "A-Za-z0-9/.,()\\- ]+$");
    public static final Pattern MOO = Pattern.compile("^\\d{1,3}$");
    public static final Pattern POSTAL_CODE = Pattern.compile("^\\d{5}$");

    public static final Set<String> PREFIXES = Set.of("นาย", "นาง", "นางสาว");

    private static final Pattern WHITESPACE = Pattern.compile("\\s+");

    /** ตัดช่องว่างหัวท้าย และยุบช่องว่างซ้อนเหลือช่องเดียว — null/ว่าง คืน null */
    public String clean(String value) {
        if (value == null) return null;
        String cleaned = WHITESPACE.matcher(value.strip()).replaceAll(" ");
        return cleaned.isEmpty() ? null : cleaned;
    }

    public String cleanLower(String value) {
        String cleaned = clean(value);
        return cleaned == null ? null : cleaned.toLowerCase(Locale.ROOT);
    }

    /** เบอร์โทร: เก็บเฉพาะตัวเลข (ผู้ใช้อาจพิมพ์ 081-234-5678 มา) */
    public String digitsOnly(String value) {
        if (value == null) return null;
        String digits = value.replaceAll("[\\s-]", "");
        return digits.isEmpty() ? null : digits;
    }

    /**
     * ตรวจฟิลด์บังคับ/ไม่บังคับ ตามรูปแบบและความยาว — ผิดแล้วใส่ข้อความลง errors
     * ส่ง value ที่ clean แล้วเข้ามา
     */
    public void check(Map<String, String> errors, String field, String value, boolean required,
            int maxLength, Pattern pattern, String formatMessage) {
        if (value == null) {
            if (required) errors.put(field, "กรุณากรอกข้อมูล");
            return;
        }
        if (value.length() > maxLength) {
            errors.put(field, "ยาวได้ไม่เกิน " + maxLength + " ตัวอักษร");
            return;
        }
        if (!pattern.matcher(value).matches()) {
            errors.put(field, formatMessage);
        }
    }
}
