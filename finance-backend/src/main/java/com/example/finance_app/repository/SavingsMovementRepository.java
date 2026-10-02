package com.example.finance_app.repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.finance_app.entity.SavingsMovement;

@Repository
public interface SavingsMovementRepository extends JpaRepository<SavingsMovement, Long> {

    // ฝาก = +amount, ถอน = -amount
    String SIGNED = "CASE WHEN m.type = 'DEPOSIT' THEN m.amount ELSE -m.amount END";

    @Query("SELECT m FROM SavingsMovement m WHERE m.savingsMovementId = :id AND m.isDeleted = false")
    Optional<SavingsMovement> findActiveById(@Param("id") Long id);

    // ยอดในกระปุกเดียว
    @Query("SELECT COALESCE(SUM(" + SIGNED + "), 0) FROM SavingsMovement m "
            + "WHERE m.savingsGoalId = :goalId AND m.isDeleted = false")
    BigDecimal sumBalance(@Param("goalId") Long goalId);

    // ยอดในกระปุก + ยอดฝากในช่วง [dateFrom, dateTo) ของทุกกระปุกของ user -> [goalId, balance, deposited]
    @Query("SELECT m.savingsGoalId, SUM(" + SIGNED + "), "
            + "SUM(CASE WHEN m.type = 'DEPOSIT' AND m.movementDate >= :dateFrom AND m.movementDate < :dateTo "
            + "         THEN m.amount ELSE 0 END) "
            + "FROM SavingsMovement m WHERE m.userId = :userId AND m.isDeleted = false "
            + "GROUP BY m.savingsGoalId")
    List<Object[]> sumByGoal(@Param("userId") Long userId,
            @Param("dateFrom") LocalDateTime dateFrom,
            @Param("dateTo") LocalDateTime dateTo);

    // ยอดฝาก/ถอนรวมของ user ก่อน dateTo -> [type, sum] (dashboard: เงินออมรวม / เงินใช้ได้)
    @Query("SELECT m.type, SUM(m.amount) FROM SavingsMovement m "
            + "WHERE m.userId = :userId AND m.isDeleted = false AND m.movementDate < :dateTo "
            + "GROUP BY m.type")
    List<Object[]> sumByTypeBefore(@Param("userId") Long userId, @Param("dateTo") LocalDateTime dateTo);

    // ยอดฝาก/ถอนของ user ในช่วง [dateFrom, dateTo) -> [type, sum] (dashboard: ออมเดือนนี้)
    @Query("SELECT m.type, SUM(m.amount) FROM SavingsMovement m "
            + "WHERE m.userId = :userId AND m.isDeleted = false "
            + "AND m.movementDate >= :dateFrom AND m.movementDate < :dateTo "
            + "GROUP BY m.type")
    List<Object[]> sumByTypeBetween(@Param("userId") Long userId,
            @Param("dateFrom") LocalDateTime dateFrom,
            @Param("dateTo") LocalDateTime dateTo);

    // ประวัติฝาก-ถอนของกระปุก (ใหม่ -> เก่า)
    @Query("SELECT m FROM SavingsMovement m WHERE m.savingsGoalId = :goalId AND m.isDeleted = false "
            + "ORDER BY m.movementDate DESC, m.savingsMovementId DESC")
    Page<SavingsMovement> findByGoal(@Param("goalId") Long goalId, Pageable pageable);

    // ชื่อกระปุกของรายการถอนไปใช้ (หน้าประวัติธุรกรรม: badge "จากเงินออม") -> [movementId, goalId, goalName]
    @Query("SELECT m.savingsMovementId, g.savingsGoalId, g.name FROM SavingsMovement m, SavingsGoal g "
            + "WHERE g.savingsGoalId = m.savingsGoalId AND m.savingsMovementId IN :movementIds")
    List<Object[]> findGoalNames(@Param("movementIds") Collection<Long> movementIds);
}
