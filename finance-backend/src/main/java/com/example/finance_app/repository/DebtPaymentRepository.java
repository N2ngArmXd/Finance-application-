package com.example.finance_app.repository;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.finance_app.entity.DebtPayment;

@Repository
public interface DebtPaymentRepository extends JpaRepository<DebtPayment, Long> {

    @Query("SELECT p FROM DebtPayment p WHERE p.debtPaymentId = :id AND p.isDeleted = false")
    Optional<DebtPayment> findActiveById(@Param("id") Long id);

    // ยอดที่จ่ายแล้วของหนี้ก้อนเดียว
    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM DebtPayment p WHERE p.debtId = :debtId AND p.isDeleted = false")
    BigDecimal sumPaid(@Param("debtId") Long debtId);

    // ยอดจ่ายแล้ว / จำนวนครั้ง / วันที่จ่ายล่าสุด ของทุกหนี้ของ user -> [debtId, sum, count, lastDate]
    @Query("SELECT p.debtId, SUM(p.amount), COUNT(p), MAX(p.paymentDate) FROM DebtPayment p "
            + "WHERE p.userId = :userId AND p.isDeleted = false GROUP BY p.debtId")
    List<Object[]> sumByDebt(@Param("userId") Long userId);

    // ประวัติการจ่ายของหนี้ก้อนเดียว (ใหม่ -> เก่า)
    @Query("SELECT p FROM DebtPayment p WHERE p.debtId = :debtId AND p.isDeleted = false "
            + "ORDER BY p.paymentDate DESC, p.debtPaymentId DESC")
    List<DebtPayment> findByDebt(@Param("debtId") Long debtId);

    // ชื่อเจ้าหนี้ของรายจ่ายชำระหนี้ (หน้าประวัติธุรกรรม) -> [paymentId, debtId, creditorName, debtDeleted]
    @Query("SELECT p.debtPaymentId, d.debtId, d.creditorName, d.isDeleted FROM DebtPayment p, Debt d "
            + "WHERE d.debtId = p.debtId AND p.debtPaymentId IN :paymentIds")
    List<Object[]> findDebtNames(@Param("paymentIds") Collection<Long> paymentIds);
}
