package com.example.finance_app.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Setter
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "categories", schema = "\"finance-app\"")
@JsonIgnoreProperties({ "hibernateLazyInitializer", "handler" })
public class Categories {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name")
    private String name; // เช่น อาหาร, เดินทาง

    @Column(name = "type")
    private String type; // INCOME หรือ EXPENSE

    @Column(name = "icon")
    private String icon;

    @Column(name = "is_deleted")
    private boolean isDeleted = false;

    // หมวดหมู่เป็นชุด default กลาง ใช้ร่วมกันทุก user จึงไม่ผูก user_id อีกต่อไป
    // (คอลัมน์ user_id เดิมใน DB ปล่อยไว้ได้ ไม่กระทบการทำงาน)
}
