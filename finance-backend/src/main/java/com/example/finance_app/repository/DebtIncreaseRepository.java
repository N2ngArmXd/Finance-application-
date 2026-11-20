package com.example.finance_app.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.finance_app.entity.DebtIncrease;

@Repository
public interface DebtIncreaseRepository extends JpaRepository<DebtIncrease, Long> {

    @Query("SELECT i FROM DebtIncrease i WHERE i.debtIncreaseId = :id AND i.isDeleted = false")
    Optional<DebtIncrease> findActiveById(@Param("id") Long id);

    // ประวัติการเพิ่มยอดของหนี้ก้อนเดียว (ใหม่ -> เก่า)
    @Query("SELECT i FROM DebtIncrease i WHERE i.debtId = :debtId AND i.isDeleted = false "
            + "ORDER BY i.increaseDate DESC, i.debtIncreaseId DESC")
    List<DebtIncrease> findByDebt(@Param("debtId") Long debtId);

    // ชื่อเจ้าหนี้ของรายการเพิ่มยอด (หน้าประวัติธุรกรรม) -> [increaseId, debtId, creditorName, debtDeleted]
    @Query("SELECT i.debtIncreaseId, d.debtId, d.creditorName, d.isDeleted FROM DebtIncrease i, Debt d "
            + "WHERE d.debtId = i.debtId AND i.debtIncreaseId IN :ids")
    List<Object[]> findDebtNames(@Param("ids") Collection<Long> ids);
}
