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
 * ตอน start: เข้ารหัสรหัสผ่านทุกแถวที่ยังเป็น text ธรรมดา (idempotent — แถวที่เข้ารหัสแล้วข้ามไป)
 */
@Component
public class PasswordEncryptionMigration implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(PasswordEncryptionMigration.class);

    private final UsersRepository usersRepository;
    private final PasswordCipher passwordCipher;

    public PasswordEncryptionMigration(UsersRepository usersRepository, PasswordCipher passwordCipher) {
        this.usersRepository = usersRepository;
        this.passwordCipher = passwordCipher;
    }

    @Override
    public void run(String... args) {
        List<Users> changed = new ArrayList<>();
        for (Users user : usersRepository.findAll()) {
            String stored = user.getPassword();
            if (stored != null && !passwordCipher.isEncrypted(stored)) {
                user.setPassword(passwordCipher.encrypt(stored));
                changed.add(user);
            }
        }
        // saveAll ชัดเจน — ไม่พึ่ง dirty checking ของ transaction
        usersRepository.saveAll(changed);
        log.info("Password encryption check: {} plain-text password(s) encrypted", changed.size());
    }
}
