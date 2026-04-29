package com.example.finance_app.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.finance_app.dto.request.RegisterRequest;
import com.example.finance_app.entity.Users;
import com.example.finance_app.repository.UsersRepository;

import jakarta.transaction.Transactional;

@Service
@Transactional
public class RegisterService {

    @Autowired
    private UsersRepository userRepository;

    // Step 1 : สร้าง User พื้นฐานและคืนค่า ID
    public Long registerStep1(RegisterRequest request) {

        Users user = new Users();
        user.setUsername(request.getUsername());
        user.setPassword(request.getPassword());
        user.setEmail(request.getEmail());

        Users savedUser = userRepository.save(user);

        return savedUser.getId();
    }

    // Step 2 : ข้อมูลส่วนตัว
    public void registerStep2(Long userId, RegisterRequest request) {

        Users user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("ไม่พบผู้ใช้ดังกล่าว"));

        user.setProfileImage(request.getProfileImage());

        user.setUserPrefix(request.getUserPrefix());
        user.setUserFirstName(request.getUserFirstName());
        user.setUserLastName(request.getUserLastName());
        user.setUserNickName(request.getUserNickName());
        user.setUserPhone(request.getUserPhone());

        userRepository.save(user);
    }

    // Step 3 : ข้อมูลที่อยู่
    public void registerStep3(Long userId, RegisterRequest request) {

        Users user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("ไม่พบผู้ใช้ดังกล่าว"));

        user.setProvince(request.getProvince());
        user.setDistrict(request.getDistrict());
        user.setSubDistrict(request.getSubDistrict());
        user.setRoad(request.getRoad());
        user.setAlley(request.getAlley());
        user.setMoo(request.getMoo());
        user.setHouseNo(request.getHouseNo());
        user.setPostalCode(request.getPostalCode());

        userRepository.save(user);
    }
}
