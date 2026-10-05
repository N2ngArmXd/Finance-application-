package com.example.finance_app.security;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * เข้ารหัส/ถอดรหัสรหัสผ่านด้วย AES-256-GCM (ถอดกลับได้ด้วย key ใน .env เท่านั้น)
 *
 * รูปแบบที่เก็บใน DB: "v1:" + base64(IV 12 bytes + ciphertext + GCM tag)
 * - IV สุ่มใหม่ทุกครั้ง → รหัสเดียวกันได้ค่าใน DB ไม่ซ้ำกัน
 * - GCM tag ทำให้รู้ถ้ามีคนแก้ค่าใน DB (ถอดไม่ผ่าน)
 * - "v1" = รุ่นของ key เผื่ออนาคตต้องเปลี่ยน key
 */
@Component
public class PasswordCipher {

    private static final String PREFIX = "v1:";
    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int IV_LENGTH = 12;
    private static final int TAG_BITS = 128;

    private final SecretKey key;
    private final SecureRandom random = new SecureRandom();

    public PasswordCipher(@Value("${app.security.password-key}") String base64Key) {
        byte[] keyBytes = Base64.getDecoder().decode(base64Key.trim());
        if (keyBytes.length != 32) {
            throw new IllegalStateException("PASSWORD_ENC_KEY ต้องเป็น base64 ของ 32 bytes (AES-256)");
        }
        this.key = new SecretKeySpec(keyBytes, "AES");
    }

    public boolean isEncrypted(String stored) {
        return stored != null && stored.startsWith(PREFIX);
    }

    public String encrypt(String plain) {
        try {
            byte[] iv = new byte[IV_LENGTH];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            byte[] encrypted = cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8));

            byte[] out = ByteBuffer.allocate(iv.length + encrypted.length).put(iv).put(encrypted).array();
            return PREFIX + Base64.getEncoder().encodeToString(out);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("เข้ารหัสรหัสผ่านไม่สำเร็จ", e);
        }
    }

    public String decrypt(String stored) {
        if (!isEncrypted(stored)) {
            throw new IllegalArgumentException("รหัสผ่านใน DB ยังไม่ได้เข้ารหัส");
        }
        try {
            byte[] data = Base64.getDecoder().decode(stored.substring(PREFIX.length()));
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, data, 0, IV_LENGTH));
            byte[] plain = cipher.doFinal(data, IV_LENGTH, data.length - IV_LENGTH);
            return new String(plain, StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException e) {
            // key ไม่ตรง หรือค่าใน DB ถูกแก้
            throw new IllegalStateException("ถอดรหัสรหัสผ่านไม่สำเร็จ", e);
        }
    }

    /** เทียบรหัสที่ผู้ใช้กรอกกับค่าที่เข้ารหัสใน DB — constant-time กันเดาจากเวลา */
    public boolean matches(String rawPassword, String stored) {
        if (rawPassword == null || !isEncrypted(stored)) return false;
        return MessageDigest.isEqual(
                decrypt(stored).getBytes(StandardCharsets.UTF_8),
                rawPassword.getBytes(StandardCharsets.UTF_8));
    }
}
