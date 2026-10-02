package com.example.finance_app.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.finance_app.entity.SavingsGoal;

@Repository
public interface SavingsGoalRepository extends JpaRepository<SavingsGoal, Long> {

    @Query("SELECT g FROM SavingsGoal g WHERE g.userId = :userId AND g.isDeleted = false ORDER BY g.createdAt ASC")
    List<SavingsGoal> findActiveByUserId(@Param("userId") Long userId);

    @Query("SELECT g FROM SavingsGoal g WHERE g.savingsGoalId = :id AND g.isDeleted = false")
    Optional<SavingsGoal> findActiveById(@Param("id") Long id);
}
