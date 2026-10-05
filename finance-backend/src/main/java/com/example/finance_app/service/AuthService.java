package com.example.finance_app.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.finance_app.dto.request.LoginRequest;
import com.example.finance_app.dto.request.RegisterRequest;
import com.example.finance_app.dto.response.AuthResponse;
import com.example.finance_app.entity.Users;
import com.example.finance_app.repository.UsersRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.PersistenceException;
import jakarta.transaction.Transactional;

@Service
@Transactional
public class AuthService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @PersistenceContext
    private EntityManager entityManager;

    @Autowired
    private UsersRepository usersRepository;

    @Autowired
    private InputSanitizer sanitizer;

    // ====================== Login ======================

    public AuthResponse login(LoginRequest req) {

        // username เก็บตามที่สมัคร (มีตัวใหญ่ได้) แต่ตอน login เทียบเป็นตัวเล็กทั้งคู่
        String username = sanitizer.cleanLower(req.getUsername());
        String password = req.getPassword();

        if (username != null && password != null && !password.isEmpty()) {
            List<Users> candidates = usersRepository.findAllByUsernameIgnoreCase(username);
            for (Users user : candidates) {
                if (passwordMatches(user, password)) {
                    AuthResponse res = new AuthResponse();
                    res.setId(user.getId());
                    res.setUsername(user.getUsername());
                    res.setMessage("เข้าสู่ระบบสำเร็จ");
                    return res;
                }
            }
        }

        throw new RuntimeException("Username หรือ Password ไม่ถูกต้อง");
    }

    /**
     * เทียบรหัสผ่าน — รหัสใน DB เก็บเป็น text (ตามที่ตกลงกันไว้ ไม่ใช้ hash)
     * ใช้ MessageDigest.isEqual (constant-time) แทน equals กันการเดารหัสจากเวลาที่ใช้เทียบ
     */
    private boolean passwordMatches(Users user, String rawPassword) {
        String stored = user.getPassword();
        if (stored == null) return false;

        return MessageDigest.isEqual(
                stored.getBytes(StandardCharsets.UTF_8),
                rawPassword.getBytes(StandardCharsets.UTF_8));
    }

    // ====================== Register ======================

    /**
     * ตรวจข้อมูลหน้า "บัญชี" (step 1) ก่อนไปหน้าถัดไป — ยังไม่บันทึกอะไร
     * ถ้าไม่ผ่านจะโยน InputValidationException
     */
    public void checkAccount(RegisterRequest request) {
        Map<String, String> errors = new LinkedHashMap<>();
        validateAccount(request, errors);
        throwIfAny(errors);
    }

    /**
     * ตรวจข้อมูลครบทั้ง 3 ส่วน + ข้อมูลซ้ำ (username/email/เบอร์โทร) — ไม่บันทึก
     * หน้าบ้านเรียกก่อนเปิด popup ยืนยันการสมัคร
     */
    public void validateRegistration(RegisterRequest request) {
        Map<String, String> errors = new LinkedHashMap<>();
        validateAccount(request, errors);
        validateProfile(request, errors);
        validateAddress(request, errors);
        throwIfAny(errors);
    }

    /**
     * สมัครสมาชิกครั้งเดียวด้วยข้อมูลครบทั้ง 3 ส่วน
     * (เดิมแยก step1/2/3 และ step 2/3 รับ userId จาก URL → ใครก็เขียนทับข้อมูลคนอื่นได้)
     */
    public void register(RegisterRequest request) {
        // ตรวจซ้ำอีกรอบก่อนบันทึก — ไม่เชื่อว่าหน้าบ้านเรียก validate มาแล้ว
        validateRegistration(request);

        Users user = new Users();
        user.setId(generateUnique13DigitId());
        user.setUsername(request.getUsername());
        user.setPassword(request.getPassword());
        user.setEmail(request.getEmail());

        user.setUserPrefix(request.getUserPrefix());
        user.setUserFirstName(request.getUserFirstName());
        user.setUserLastName(request.getUserLastName());
        user.setUserNickName(request.getUserNickName());
        user.setUserPhone(request.getUserPhone());

        user.setProvince(request.getProvince());
        user.setDistrict(request.getDistrict());
        user.setSubDistrict(request.getSubDistrict());
        user.setRoad(request.getRoad());
        user.setAlley(request.getAlley());
        user.setMoo(request.getMoo());
        user.setHouseNo(request.getHouseNo());
        user.setPostalCode(request.getPostalCode());

        // ใช้ persist (INSERT เท่านั้น) แทน repository.save — save() กับ entity ที่กำหนด id เอง
        // จะกลายเป็น merge ซึ่งถ้า id ชนกับ user เดิมจะ UPDATE ทับข้อมูลคนนั้นแทนที่จะ error
        // ถ้าชนจริง (id หรือ username ถูกแทรกเข้ามาระหว่างตรวจกับบันทึก) DB จะปฏิเสธด้วย PK/unique
        try {
            entityManager.persist(user);
            entityManager.flush();
        } catch (PersistenceException e) {
            throw new InputValidationException(Map.of(),
                    "มีข้อมูลซ้ำกับผู้ใช้อื่นระหว่างบันทึก กรุณากดยืนยันอีกครั้ง");
        }
    }

    // ---------- validation (แก้ค่าใน request ให้เป็นค่าที่ clean แล้วด้วย) ----------

    private void validateAccount(RegisterRequest r, Map<String, String> errors) {
        // username/email เก็บตามที่พิมพ์ (ตัวใหญ่ได้) — การเช็คซ้ำ/login เทียบแบบไม่สนตัวพิมพ์
        r.setUsername(sanitizer.clean(r.getUsername()));
        r.setEmail(sanitizer.clean(r.getEmail()));
        // รหัสผ่านไม่ clean — ใช้ตามที่ผู้ใช้พิมพ์ทุกตัว
        if (r.getPassword() != null && r.getPassword().isEmpty()) r.setPassword(null);

        sanitizer.check(errors, "username", r.getUsername(), true, 20, InputSanitizer.USERNAME,
                "ใช้ได้เฉพาะ A-Z, a-z, 0-9 และ _ ความยาว 4–20 ตัว");
        sanitizer.check(errors, "password", r.getPassword(), true, 64, InputSanitizer.PASSWORD,
                "อย่างน้อย 8 ตัว ต้องมีตัวอักษรและตัวเลข (ห้ามมีช่องว่างหรือภาษาไทย)");
        sanitizer.check(errors, "email", r.getEmail(), true, 100, InputSanitizer.EMAIL,
                "รูปแบบอีเมลไม่ถูกต้อง");

        if (!errors.containsKey("username") && usersRepository.existsByUsernameIgnoreCase(r.getUsername())) {
            errors.put("username", "ชื่อผู้ใช้นี้มีคนใช้แล้ว");
        }
        if (!errors.containsKey("email") && usersRepository.existsByEmailIgnoreCase(r.getEmail())) {
            errors.put("email", "อีเมลนี้ถูกใช้สมัครแล้ว");
        }
    }

    private void validateProfile(RegisterRequest r, Map<String, String> errors) {
        r.setUserPrefix(sanitizer.clean(r.getUserPrefix()));
        r.setUserFirstName(sanitizer.clean(r.getUserFirstName()));
        r.setUserLastName(sanitizer.clean(r.getUserLastName()));
        r.setUserNickName(sanitizer.clean(r.getUserNickName()));
        r.setUserPhone(sanitizer.digitsOnly(r.getUserPhone()));

        if (r.getUserPrefix() == null) {
            errors.put("userPrefix", "กรุณาเลือกคำนำหน้า");
        } else if (!InputSanitizer.PREFIXES.contains(r.getUserPrefix())) {
            errors.put("userPrefix", "คำนำหน้าไม่ถูกต้อง");
        }
        String nameMsg = "ใช้ได้เฉพาะตัวอักษรไทย/อังกฤษ";
        sanitizer.check(errors, "userFirstName", r.getUserFirstName(), true, 50, InputSanitizer.PERSON_NAME, nameMsg);
        sanitizer.check(errors, "userLastName", r.getUserLastName(), true, 50, InputSanitizer.PERSON_NAME, nameMsg);
        sanitizer.check(errors, "userNickName", r.getUserNickName(), true, 30, InputSanitizer.PERSON_NAME, nameMsg);
        sanitizer.check(errors, "userPhone", r.getUserPhone(), true, 10, InputSanitizer.PHONE,
                "เบอร์โทรต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 0");

        if (!errors.containsKey("userPhone") && usersRepository.existsByUserPhone(r.getUserPhone())) {
            errors.put("userPhone", "เบอร์โทรนี้ถูกใช้สมัครแล้ว");
        }
    }

    private void validateAddress(RegisterRequest r, Map<String, String> errors) {
        r.setHouseNo(sanitizer.clean(r.getHouseNo()));
        r.setMoo(sanitizer.clean(r.getMoo()));
        r.setAlley(sanitizer.clean(r.getAlley()));
        r.setRoad(sanitizer.clean(r.getRoad()));
        r.setSubDistrict(sanitizer.clean(r.getSubDistrict()));
        r.setDistrict(sanitizer.clean(r.getDistrict()));
        r.setProvince(sanitizer.clean(r.getProvince()));
        r.setPostalCode(sanitizer.clean(r.getPostalCode()));

        String addressMsg = "ใช้ได้เฉพาะตัวอักษร ตัวเลข และ / - . , ( )";
        String placeMsg = "ใช้ได้เฉพาะตัวอักษรไทย/อังกฤษ";
        sanitizer.check(errors, "houseNo", r.getHouseNo(), true, 20, InputSanitizer.ADDRESS_TEXT, addressMsg);
        sanitizer.check(errors, "moo", r.getMoo(), false, 3, InputSanitizer.MOO, "ใส่ได้เฉพาะตัวเลข");
        sanitizer.check(errors, "alley", r.getAlley(), false, 100, InputSanitizer.ADDRESS_TEXT, addressMsg);
        sanitizer.check(errors, "road", r.getRoad(), false, 100, InputSanitizer.ADDRESS_TEXT, addressMsg);
        sanitizer.check(errors, "subDistrict", r.getSubDistrict(), true, 50, InputSanitizer.PLACE_NAME, placeMsg);
        sanitizer.check(errors, "district", r.getDistrict(), true, 50, InputSanitizer.PLACE_NAME, placeMsg);
        sanitizer.check(errors, "province", r.getProvince(), true, 50, InputSanitizer.PLACE_NAME, placeMsg);
        sanitizer.check(errors, "postalCode", r.getPostalCode(), true, 5, InputSanitizer.POSTAL_CODE,
                "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก");
    }

    private void throwIfAny(Map<String, String> errors) {
        if (!errors.isEmpty()) throw new InputValidationException(errors);
    }

    // สุ่ม id 13 หลักจนกว่าจะไม่ซ้ำกับใน DB — ใช้ SecureRandom เพราะ id ถูกใช้อ้างอิง user ใน API
    // ถ้าเดาได้ง่าย คนอื่นจะไล่ id ได้
    private Long generateUnique13DigitId() {
        Long newId;
        do {
            newId = SECURE_RANDOM.nextLong(1_000_000_000_000L, 10_000_000_000_000L);
        } while (usersRepository.existsById(newId));
        return newId;
    }
}
