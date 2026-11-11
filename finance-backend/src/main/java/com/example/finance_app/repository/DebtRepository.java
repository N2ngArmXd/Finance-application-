package com.example.finance_app.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.finance_app.entity.Debt;

@Repository
public interface DebtRepository extends JpaRepository<Debt, Long> {

    @Query("SELECT d FROM Debt d WHERE d.userId = :userId AND d.isDeleted = false ORDER BY d.createdAt DESC")
    List<Debt> findActiveByUserId(@Param("userId") Long userId);

    @Query("SELECT d FROM Debt d WHERE d.debtId = :id AND d.isDeleted = false")
    Optional<Debt> findActiveById(@Param("id") Long id);
}
