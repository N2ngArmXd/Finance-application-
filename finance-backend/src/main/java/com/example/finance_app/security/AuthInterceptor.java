package com.example.finance_app.security;

import java.nio.charset.StandardCharsets;

import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.util.WebUtils;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * ตรวจ JWT ใน cookie ทุก request ของ /finance-app/** (ยกเว้น login/logout/register — ดู WebConfig)
 * ผ่าน → เก็บ userId ไว้ใน request attribute ให้ @CurrentUser ดึงไปใช้ · ไม่ผ่าน → 401
 */
@Component
public class AuthInterceptor implements HandlerInterceptor {

    public static final String USER_ID_ATTR = "auth.userId";

    private final JwtService jwtService;

    public AuthInterceptor(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {
        if (HttpMethod.OPTIONS.matches(request.getMethod())) return true;

        Cookie cookie = WebUtils.getCookie(request, JwtService.COOKIE_NAME);
        Long userId = jwtService.verify(cookie != null ? cookie.getValue() : null);
        if (userId == null) {
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding(StandardCharsets.UTF_8.name());
            response.getWriter().write("{\"message\":\"กรุณาเข้าสู่ระบบใหม่\"}");
            return false;
        }
        request.setAttribute(USER_ID_ATTR, userId);
        return true;
    }
}
