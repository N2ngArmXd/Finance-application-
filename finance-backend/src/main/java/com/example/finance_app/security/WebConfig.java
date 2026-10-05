package com.example.finance_app.security;

import java.util.List;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.MethodParameter;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final AuthInterceptor authInterceptor;

    public WebConfig(AuthInterceptor authInterceptor) {
        this.authInterceptor = authInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authInterceptor)
                .addPathPatterns("/finance-app/**")
                // เข้าได้โดยไม่ต้อง login
                .excludePathPatterns(
                        "/finance-app/login",
                        "/finance-app/logout",
                        "/finance-app/register",
                        "/finance-app/register/**");
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(new HandlerMethodArgumentResolver() {
            @Override
            public boolean supportsParameter(MethodParameter parameter) {
                return parameter.hasParameterAnnotation(CurrentUser.class);
            }

            @Override
            public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                    NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
                Object userId = webRequest.getAttribute(AuthInterceptor.USER_ID_ATTR, RequestAttributes.SCOPE_REQUEST);
                if (userId == null) {
                    // endpoint ที่ใช้ @CurrentUser ต้องอยู่ใต้ interceptor เสมอ
                    throw new IllegalStateException("ไม่พบผู้ใช้ที่เข้าสู่ระบบ");
                }
                return userId;
            }
        });
    }
}
