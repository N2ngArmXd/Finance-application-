package com.example.finance_app.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.finance_app.entity.Transaction;

import jakarta.transaction.Transactional;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    @Query(value = "SELECT * FROM transactions WHERE user_id = :userId AND is_deleted = false", nativeQuery = true)
    List<Transaction> findActiveByUserId(@Param("userId") Long userId);

    @Modifying
    @Transactional
    @Query(value = "UPDATE transactions SET is_deleted = true WHERE id = :id AND user_id = :userId", nativeQuery = true)
    int deleteTransactionById(@Param("id") Long id, @Param("userId") Long userId);

    // ลบหลายรายการพร้อมกัน (soft delete) เฉพาะของเจ้าของ
    @Modifying
    @Transactional
    @Query("UPDATE Transaction t SET t.isDeleted = true WHERE t.id IN :ids AND t.userId.id = :userId")
    int softDeleteByIds(@Param("ids") List<Long> ids, @Param("userId") Long userId);

    // Get list Transaction
    @Query("SELECT t FROM Transaction t " +
            "JOIN FETCH t.categoryId c " +
            "WHERE t.userId.id = :userId " +
            "AND t.isDeleted = false " +
            "ORDER BY t.transactionDate DESC")
    List<Transaction> findAllActiveTransactionsByUserId(@Param("userId") Long userId);

    // เงื่อนไขค้นหา/กรองแบบ optional (พารามิเตอร์ null = ไม่กรองข้อนั้น) ใช้ร่วมกันทั้งหน้าและยอดสรุป
    String FILTER = "WHERE t.userId.id = :userId AND t.isDeleted = false "
            + "AND (:type IS NULL OR c.type = :type) "
            + "AND (:categoryId IS NULL OR c.id = :categoryId) "
            // ใช้ COALESCE กับคอลัมน์ timestamp เพื่อให้ Postgres อนุมานชนิด param ได้ (เลี่ยง :date IS NULL บน param เปล่า)
            + "AND t.transactionDate >= COALESCE(:dateFrom, t.transactionDate) "
            + "AND t.transactionDate <= COALESCE(:dateTo, t.transactionDate) "
            // cast :search ทุกจุด (รวม IS NULL) กัน Postgres เดาชนิดพารามิเตอร์ไม่ได้ตอนส่ง null
            + "AND (CAST(:search AS string) IS NULL "
            + "     OR LOWER(t.description) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')) "
            + "     OR LOWER(c.name) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')) "
            + "     OR CAST(t.id AS string) LIKE CONCAT('%', CAST(:search AS string), '%'))";
    @Query(value = "SELECT t FROM Transaction t JOIN FETCH t.categoryId c " + FILTER,
            countQuery = "SELECT COUNT(t) FROM Transaction t JOIN t.categoryId c " + FILTER)
    Page<Transaction> searchTransactions(
            @Param("userId") Long userId,
            @Param("search") String search,
            @Param("type") String type,
            @Param("categoryId") Long categoryId,
            @Param("dateFrom") LocalDateTime dateFrom,
            @Param("dateTo") LocalDateTime dateTo,
            Pageable pageable);

    // ยอดรวมแยกตามประเภท (INCOME/EXPENSE) ของทั้งชุดที่ตรงเงื่อนไข -> [type, sum]
    @Query("SELECT c.type, SUM(t.amount) FROM Transaction t JOIN t.categoryId c " + FILTER + " GROUP BY c.type")
    List<Object[]> sumByType(
            @Param("userId") Long userId,
            @Param("search") String search,
            @Param("type") String type,
            @Param("categoryId") Long categoryId,
            @Param("dateFrom") LocalDateTime dateFrom,
            @Param("dateTo") LocalDateTime dateTo);
}