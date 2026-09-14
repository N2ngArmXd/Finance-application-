package com.example.finance_app.config;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import com.example.finance_app.entity.Categories;
import com.example.finance_app.repository.CategoriesRepository;

/**
 * จัดระเบียบหมวดหมู่ให้เป็นชุด default กลางที่สะอาด ทำงานตอน start (idempotent):
 * - หมวดที่ชื่อ+ประเภทตรงกับ default → อัปเดต icon ให้เป็น emoji ที่ถูกต้อง และเปิดใช้งาน
 * - หมวด default ที่ยังไม่มี → เพิ่มใหม่
 * - หมวดเก่าที่ไม่อยู่ในชุด default (เช่น ที่ user เคยสร้างเอง icon เป็นชื่อ Tabler) → ซ่อน (soft delete)
 * ธุรกรรมเก่ายังอ้างอิงหมวดที่ซ่อนได้ตามปกติ (ไม่ลบแถวจริง)
 */
@Component
public class DefaultCategoryInitializer implements CommandLineRunner {

    private final CategoriesRepository categoriesRepository;

    // {name, type, icon} — icon เก็บเป็น "ชื่อไอคอน lucide" (map เป็น component ฝั่งหน้าเว็บ)
    private static final String[][] DEFAULTS = {
            { "อาหาร", "EXPENSE", "Utensils" },
            { "เดินทาง", "EXPENSE", "Car" },
            { "ช้อปปิ้ง", "EXPENSE", "ShoppingBag" },
            { "บ้าน-ที่พัก", "EXPENSE", "Home" },
            { "บิล-ค่าน้ำค่าไฟ", "EXPENSE", "ReceiptText" },
            { "สุขภาพ", "EXPENSE", "HeartPulse" },
            { "บันเทิง", "EXPENSE", "Music" },
            { "การศึกษา", "EXPENSE", "GraduationCap" },
            { "อื่นๆ", "EXPENSE", "Circle" },
            { "เงินเดือน", "INCOME", "Wallet" },
            { "โบนัส", "INCOME", "Coins" },
            { "ลงทุน", "INCOME", "TrendingUp" },
            { "ของขวัญ", "INCOME", "Gift" },
            { "อื่นๆ", "INCOME", "Circle" },
    };

    private static String key(String name, String type) {
        return name + "|" + type;
    }

    public DefaultCategoryInitializer(CategoriesRepository categoriesRepository) {
        this.categoriesRepository = categoriesRepository;
    }

    @Override
    public void run(String... args) {
        Map<String, String> canonical = new LinkedHashMap<>();
        for (String[] d : DEFAULTS) {
            canonical.put(key(d[0], d[1]), d[2]);
        }

        List<Categories> all = categoriesRepository.findAll();
        Map<String, Categories> existingByKey = new LinkedHashMap<>();

        // จัดการหมวดที่มีอยู่: เปิด/แก้ icon ถ้าเป็น default, ซ่อนถ้าไม่ใช่
        for (Categories c : all) {
            String k = key(c.getName(), c.getType());
            if (canonical.containsKey(k) && !existingByKey.containsKey(k)) {
                c.setIcon(canonical.get(k));
                c.setDeleted(false);
                existingByKey.put(k, c);
                categoriesRepository.save(c);
            } else {
                // หมวดเก่านอกชุด default หรือหมวด default ที่ซ้ำ → ซ่อน
                if (!c.isDeleted()) {
                    c.setDeleted(true);
                    categoriesRepository.save(c);
                }
            }
        }

        // เพิ่มหมวด default ที่ยังไม่มี
        for (String[] d : DEFAULTS) {
            if (!existingByKey.containsKey(key(d[0], d[1]))) {
                Categories category = new Categories();
                category.setName(d[0]);
                category.setType(d[1]);
                category.setIcon(d[2]);
                category.setDeleted(false);
                categoriesRepository.save(category);
            }
        }
    }
}
