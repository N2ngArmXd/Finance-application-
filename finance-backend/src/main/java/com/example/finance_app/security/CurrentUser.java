package com.example.finance_app.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * ใส่บน parameter ของ controller (Long) เพื่อรับ userId ของคนที่ login อยู่ (มาจาก JWT)
 * ใช้แทน userId ที่ client ส่งมา — client ปลอม id คนอื่นไม่ได้
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface CurrentUser {
}
