package com.example.finance_app.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.finance_app.entity.Users;

@Repository
public interface UsersRepository extends JpaRepository<Users, Long> {

    // username เก็บตามที่สมัคร (มีตัวใหญ่ได้) — เทียบแบบไม่สนตัวพิมพ์
    // คืน List เพราะข้อมูลเก่าอาจมี username ที่ต่างกันแค่ตัวพิมพ์ซ้ำกันอยู่
    @Query(value = "SELECT * FROM \"finance-app\".users_register WHERE LOWER(username) = LOWER(:username)", nativeQuery = true)
    List<Users> findAllByUsernameIgnoreCase(@Param("username") String username);

    @Query(value = "SELECT COUNT(*) > 0 FROM \"finance-app\".users_register WHERE LOWER(username) = LOWER(:username)", nativeQuery = true)
    boolean existsByUsernameIgnoreCase(@Param("username") String username);

    @Query(value = "SELECT COUNT(*) > 0 FROM \"finance-app\".users_register WHERE LOWER(email) = LOWER(:email)", nativeQuery = true)
    boolean existsByEmailIgnoreCase(@Param("email") String email);

    // เบอร์เก่าอาจเก็บแบบมีขีด (081-234-5678) — ตัดขีด/ช่องว่างออกก่อนเทียบ
    @Query(value = "SELECT COUNT(*) > 0 FROM \"finance-app\".users_register WHERE REGEXP_REPLACE(user_phone, '[\\s-]', '', 'g') = :phone", nativeQuery = true)
    boolean existsByUserPhone(@Param("phone") String phone);

}
