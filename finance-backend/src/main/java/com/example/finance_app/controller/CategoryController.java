package com.example.finance_app.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.finance_app.entity.Categories;
import com.example.finance_app.service.CategoryService;

@RestController
@RequestMapping("/finance-app")
@CrossOrigin(origins = "*")
public class CategoryController {

    @Autowired
    private CategoryService categoryService;

    @PostMapping("/categories/getCategoriesList")
    public ResponseEntity<List<Categories>> getCategoriesList() {
        List<Categories> categories = categoryService.getMyCategories();
        return ResponseEntity.ok(categories);
    }
}
