package com.example.finance_app.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.finance_app.entity.DebtGroup;

@Repository
public interface DebtGroupRepository extends JpaRepository<DebtGroup, Long> {

    @Query("SELECT g FROM DebtGroup g WHERE g.userId = :userId AND g.isDeleted = false "
            + "ORDER BY g.billDate DESC, g.groupId DESC")
    List<DebtGroup> findActiveByUserId(@Param("userId") Long userId);

    @Query("SELECT g FROM DebtGroup g WHERE g.groupId = :id AND g.isDeleted = false")
    Optional<DebtGroup> findActiveById(@Param("id") Long id);

    // รายจ่ายยอดเต็มของบิลที่ยังอยู่ (หน้าประวัติธุรกรรม: ป้าย + ลิงก์ไปบิล) -> [transactionId, groupId, title]
    @Query("SELECT g.transactionId, g.groupId, g.title FROM DebtGroup g "
            + "WHERE g.transactionId IN :txnIds AND g.isDeleted = false")
    List<Object[]> findActiveByTransactionIds(@Param("txnIds") Collection<Long> txnIds);

    // จำนวนรายการที่เป็นรายจ่ายยอดเต็มของบิลที่ยังอยู่ (กันแก้/ลบจากหน้าประวัติ)
    @Query("SELECT COUNT(g) FROM DebtGroup g WHERE g.transactionId IN :txnIds AND g.isDeleted = false")
    long countActiveByTransactionIds(@Param("txnIds") Collection<Long> txnIds);
}
