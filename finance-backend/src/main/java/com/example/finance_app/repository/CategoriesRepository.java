package com.example.finance_app.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.example.finance_app.entity.Categories;

@Repository
public interface CategoriesRepository extends JpaRepository<Categories, Long> {

    // Find Categories by userId
    @Query(value = "SELECT * FROM categories WHERE user_id = :userId", nativeQuery = true)
    List<Categories> findByUserId(@Param("userId") Long userId);

    // Find Categories by userId and type
    @Query(value = "SELECT * FROM categories WHERE user_id = :userId AND type = :type", nativeQuery = true)
    List<Categories> findByUserIdAndType(@Param("userId") Long userId, @Param("type") String type);

    // Delete Categories by id and userId
    @Modifying
    @Transactional
    @Query(value = "DELETE FROM categories WHERE id = :id AND user_id = :userId", nativeQuery = true)
    void deleteByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

    // Find all Categories where isDeleted is false
    @Query("SELECT c FROM Categories c WHERE c.isDeleted = false ORDER BY c.name ASC")
    List<Categories> findAllActiveCategories();

}
