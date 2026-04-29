package com.example.finance_app.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Data;

@Data
@Entity
@Table(name = "users", schema = "\"finance-app\"")
public class Users {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // username and password

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    private String email;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // User info
    @Column(name = "profile_image")
    private String profileImage;

    @Column(name = "user_prefix")
    private String userPrefix;

    @Column(name = "user_firstname")
    private String userFirstName;

    @Column(name = "user_lastname")
    private String userLastName;

    @Column(name = "user_nickname")
    private String userNickName;

    @Column(name = "user_phone")
    private String userPhone;

    // Address
    @Column(name = "province")
    private String province;

    @Column(name = "district")
    private String district;

    @Column(name = "sub_district")
    private String subDistrict;

    @Column(name = "road")
    private String road;

    @Column(name = "alley")
    private String alley;

    @Column(name = "moo")
    private String moo;

    @Column(name = "house_no")
    private String houseNo;

    @Column(name = "postal_code")
    private String postalCode;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
