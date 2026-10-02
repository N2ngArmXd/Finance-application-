package com.example.finance_app.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.finance_app.entity.Categories;

@Repository
public interface CategoriesRepository extends JpaRepository<Categories, Long> {

    // หมวดหมู่เป็นชุด default กลาง ดึงทั้งหมดที่ยังไม่ถูกซ่อน
    @Query("SELECT c FROM Categories c WHERE c.isDeleted = false ORDER BY c.name ASC")
    List<Categories> findAllActiveCategories();

    @Query("SELECT c FROM Categories c WHERE c.isDeleted = false AND c.name = :name AND c.type = :type")
    Optional<Categories> findActiveByNameAndType(@Param("name") String name, @Param("type") String type);

}
