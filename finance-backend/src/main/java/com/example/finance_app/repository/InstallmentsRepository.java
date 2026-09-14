package com.example.finance_app.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.finance_app.entity.InstallmentsEntity;

import jakarta.transaction.Transactional;

@Repository
public interface InstallmentsRepository extends JpaRepository<InstallmentsEntity, Long> {

    List<InstallmentsEntity> findByUserId(Long userId);

    List<InstallmentsEntity> findByUserIdAndStatus(Long userId, String status);

    // เฉพาะรายการที่ยังไม่ถูกลบ (flag delete)
    List<InstallmentsEntity> findByUserIdAndIsDeletedFalse(Long userId);

    // soft delete: ตั้ง is_deleted = true เฉพาะรายการของเจ้าของ
    @Modifying
    @Transactional
    @Query(value = "UPDATE \"finance-app\".installments SET is_deleted = true "
            + "WHERE installments_id = :id AND user_id = :userId", nativeQuery = true)
    int softDeleteById(@Param("id") Long id, @Param("userId") Long userId);
}
