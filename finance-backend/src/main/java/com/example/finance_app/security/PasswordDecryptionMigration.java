package com.example.finance_app.security;

import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import com.example.finance_app.entity.Users;
import com.example.finance_app.repository.UsersRepository;

/**
 * ตอน start: ถอดรหัสผ่านที่เคยถูกเข้ารหัส AES ("v1:...") กลับเป็น text ธรรมดา
 * (ช่วงหนึ่งเคยเข้ารหัสรหัสผ่านใน DB — ผู้ใช้เลือกกลับไปเก็บเป็น text)
 * idempotent: แถวที่เป็น text อยู่แล้วไม่แตะ · ลบคลาสนี้ + PasswordCipher + PASSWORD_ENC_KEY ได้
 * เมื่อแน่ใจว่าไม่มีแถว "v1:" เหลือใน DB ทุกเครื่องแล้ว
 */
@Component
public class PasswordDecryptionMigration implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(PasswordDecryptionMigration.class);

    private final UsersRepository usersRepository;
    private final PasswordCipher passwordCipher;

    public PasswordDecryptionMigration(UsersRepository usersRepository, PasswordCipher passwordCipher) {
        this.usersRepository = usersRepository;
        this.passwordCipher = passwordCipher;
    }

    @Override
    public void run(String... args) {
        List<Users> changed = new ArrayList<>();
        for (Users user : usersRepository.findAll()) {
            String stored = user.getPassword();
            if (passwordCipher.isEncrypted(stored)) {
                try {
                    user.setPassword(passwordCipher.decrypt(stored));
                    changed.add(user);
                } catch (IllegalStateException e) {
                    log.error("Cannot decrypt password of user {} (wrong PASSWORD_ENC_KEY?)", user.getId());
                }
            }
        }
        usersRepository.saveAll(changed);
        if (!changed.isEmpty()) {
            log.info("Password decryption: {} encrypted password(s) restored to plain text", changed.size());
        }
    }
}
