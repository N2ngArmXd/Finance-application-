package com.example.finance_app.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.finance_app.entity.Debt;

@Repository
public interface DebtRepository extends JpaRepository<Debt, Long> {

    // หนี้ที่เราติดคนอื่น (direction null = ข้อมูลก่อนมีบิลหาร นับเป็น PAYABLE)
    @Query("SELECT d FROM Debt d WHERE d.userId = :userId AND d.isDeleted = false "
            + "AND (d.direction IS NULL OR d.direction = 'PAYABLE') ORDER BY d.createdAt DESC")
    List<Debt> findActivePayablesByUserId(@Param("userId") Long userId);

    @Query("SELECT d FROM Debt d WHERE d.debtId = :id AND d.isDeleted = false")
    Optional<Debt> findActiveById(@Param("id") Long id);

    // คนที่ต้องคืนเงินในบิลหาร (เรียงตามลำดับที่เพิ่ม)
    @Query("SELECT d FROM Debt d WHERE d.groupId IN :groupIds AND d.isDeleted = false ORDER BY d.debtId ASC")
    List<Debt> findActiveByGroupIds(@Param("groupIds") Collection<Long> groupIds);
}
