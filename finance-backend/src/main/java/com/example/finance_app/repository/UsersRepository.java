package com.example.finance_app.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.finance_app.entity.Users;

@Repository
public interface UsersRepository extends JpaRepository<Users, Long> {

    @Query(value = "SELECT * FROM \"finance-app\".users WHERE username = :username", nativeQuery = true)
    Users findByUsername(@Param("username") String username);

    @Query(value = "SELECT COUNT(*) FROM \"finance-app\".users WHERE username = :username", nativeQuery = true)
    Integer existsByUsername(@Param("username") String username);

}