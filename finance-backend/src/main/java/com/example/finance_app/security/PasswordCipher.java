package com.example.finance_app.security;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.Base64;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * ถอดรหัสผ่านที่เคยเข้ารหัสด้วย AES-256-GCM — ใช้เฉพาะ PasswordDecryptionMigration
 * (ตอนนี้รหัสผ่านเก็บเป็น text จึงไม่มีการเข้ารหัสใหม่แล้ว)
 *
 * รูปแบบเดิมใน DB: "v1:" + base64(IV 12 bytes + ciphertext + GCM tag)
 */
@Component
public class PasswordCipher {

    private static final String PREFIX = "v1:";
    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int IV_LENGTH = 12;
    private static final int TAG_BITS = 128;

    private final SecretKey key;

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

    public String decrypt(String stored) {
        if (!isEncrypted(stored)) {
            throw new IllegalArgumentException("รหัสผ่านใน DB ไม่ได้เข้ารหัส");
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
}
