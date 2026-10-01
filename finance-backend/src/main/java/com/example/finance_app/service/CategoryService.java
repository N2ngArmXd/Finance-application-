package com.example.finance_app.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.finance_app.entity.Categories;
import com.example.finance_app.repository.CategoriesRepository;

@Service
public class CategoryService {

    @Autowired
    private CategoriesRepository categoriesRepository;

    // หมวดหมู่เป็นชุด default กลาง ใช้ร่วมกันทุก user
    public List<Categories> getMyCategories() {
        return categoriesRepository.findAllActiveCategories();
    }
}
