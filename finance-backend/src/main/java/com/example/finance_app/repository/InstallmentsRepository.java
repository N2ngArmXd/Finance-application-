package com.example.finance_app.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.finance_app.entity.InstallmentsEntity;

@Repository
public interface InstallmentsRepository extends JpaRepository<InstallmentsEntity, Long> {

    List<InstallmentsEntity> findByUserId(Long userId);

    List<InstallmentsEntity> findByUserIdAndStatus(Long userId, String status);
}
