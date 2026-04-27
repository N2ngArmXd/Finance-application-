package com.example.finance_app.repository;

import java.util.List;

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

}