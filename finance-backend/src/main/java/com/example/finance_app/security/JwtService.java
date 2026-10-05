package com.example.finance_app.security;

import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

/**
 * ออก/ตรวจ JWT (HS256) — token เก็บแค่ userId (sub) + เวลาออก/หมดอายุ
 * ห้ามใส่ข้อมูลลับใน token: payload ถอดอ่านได้ทุกคน (ลายเซ็นกันแค่การแก้ไข)
 */
@Service
public class JwtService {

    public static final String COOKIE_NAME = "finance_token";

    private final SecretKey key;
    private final Duration ttl;
    private final boolean secureCookie;

    public JwtService(@Value("${app.security.jwt-secret}") String base64Secret,
            @Value("${app.security.jwt-ttl-days}") long ttlDays,
            @Value("${app.security.cookie-secure}") boolean secureCookie) {
        byte[] secret = Base64.getDecoder().decode(base64Secret.trim());
        if (secret.length < 32) {
            throw new IllegalStateException("JWT_SECRET ต้องยาวอย่างน้อย 32 bytes");
        }
        this.key = Keys.hmacShaKeyFor(secret);
        this.ttl = Duration.ofDays(ttlDays);
        this.secureCookie = secureCookie;
    }

    public String issue(Long userId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(ttl)))
                .signWith(key)
                .compact();
    }

    /** คืน userId ถ้า token ถูกต้องและยังไม่หมดอายุ ไม่งั้นคืน null */
    public Long verify(String token) {
        if (token == null || token.isBlank()) return null;
        try {
            String sub = Jwts.parser().verifyWith(key).build()
                    .parseSignedClaims(token).getPayload().getSubject();
            return Long.valueOf(sub);
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }

    // httpOnly: JS อ่านไม่ได้ (กัน XSS ขโมย token) · SameSite=Strict: เว็บอื่นส่ง cookie นี้มาไม่ได้ (กัน CSRF)
    public ResponseCookie loginCookie(String token) {
        return baseCookie(token).maxAge(ttl).build();
    }

    public ResponseCookie logoutCookie() {
        return baseCookie("").maxAge(0).build();
    }

    private ResponseCookie.ResponseCookieBuilder baseCookie(String value) {
        return ResponseCookie.from(COOKIE_NAME, value)
                .httpOnly(true)
                .secure(secureCookie)
                .sameSite("Strict")
                .path("/");
    }
}
