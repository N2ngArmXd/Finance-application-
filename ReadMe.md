# Finance App

ระบบจัดการการเงินส่วนบุคคล (Personal Finance Management) แบบ Full-Stack
ช่วยให้ผู้ใช้บันทึกรายรับ-รายจ่าย จัดหมวดหมู่ธุรกรรม ดูประวัติย้อนหลัง และติดตามรายการผ่อนชำระ (Installments) ได้ในที่เดียว

ประกอบด้วย 2 ส่วนหลัก คือ **Backend** (REST API ด้วย Spring Boot) และ **Frontend** (Single Page Application ด้วย React) โดยเชื่อมต่อฐานข้อมูล PostgreSQL

---

## ✨ Features

- **สมัครสมาชิก (Register)** — ระบบสมัครแบบหลายขั้นตอน (3 steps)
- **เข้าสู่ระบบ (Login)** — ยืนยันตัวตนผู้ใช้ และจดจำ session ผ่าน `localStorage`
- **ธุรกรรม (Transactions)** — เพิ่ม / แก้ไข / ลบ (Soft Delete) และแสดงรายการรายรับ-รายจ่าย
- **หมวดหมู่ (Categories)** — หมวดหมู่เริ่มต้นถูกสร้างอัตโนมัติ พร้อมไอคอนประจำหมวด
- **ประวัติ (History)** — ดูรายการธุรกรรมย้อนหลัง
- **ผ่อนชำระ (Installments)** — สร้างและติดตามรายการผ่อนชำระ

---

## 🛠️ Tech Stack

### Backend (`finance-backend`)
- **Java 17**
- **Spring Boot 3.5** — Web (REST API), Data JPA, Validation
- **PostgreSQL** — ฐานข้อมูลหลัก (schema: `finance-app`)
- **Hibernate / JPA** — ORM
- **Lombok** — ลด boilerplate code
- **Maven** — build & dependency management

### Frontend (`finance-frontend`)
- **React 19**
- **Vite** — build tool & dev server (HMR)
- **Tailwind CSS 4** — styling
- **Axios** — เรียก REST API
- **Recharts** — กราฟ/แสดงผลข้อมูล
- **Lucide React** — ไอคอน
- **SweetAlert2** — dialog / แจ้งเตือน

### Tooling
- **concurrently** — รัน backend และ frontend พร้อมกันด้วยคำสั่งเดียว

---

## 🚀 Getting Started

### Prerequisites
- **Java 17+** และ **Maven**
- **Node.js** (แนะนำ 18+) และ **npm**
- **PostgreSQL** ที่รันอยู่ที่ `localhost:5432`

### 1. ตั้งค่าฐานข้อมูล
สร้าง schema `finance-app` ในฐานข้อมูล PostgreSQL

ค่าเชื่อมต่อฐานข้อมูลอ่านจาก **environment variables** (ดูค่าตั้งต้นได้ที่
[`finance-backend/src/main/resources/application.properties`](finance-backend/src/main/resources/application.properties)):

| ตัวแปร | คำอธิบาย | ค่า default |
|--------|----------|-------------|
| `DB_URL` | JDBC URL ของ PostgreSQL | `jdbc:postgresql://localhost:5432/postgres?currentSchema="finance-app"` |
| `DB_USERNAME` | ชื่อผู้ใช้ฐานข้อมูล | `postgres` |
| `DB_PASSWORD` | รหัสผ่านฐานข้อมูล | *(ไม่มีค่า default — ต้องกำหนดเอง)* |

คัดลอก [`.env.example`](.env.example) เป็น `.env` แล้วใส่ค่าจริง (ไฟล์ `.env` ถูก gitignore ไว้แล้ว):

```bash
cp .env.example .env
```

จากนั้นตั้งค่า env ก่อนรัน backend เช่น

```bash
# macOS / Linux
export DB_PASSWORD=your_password

# Windows PowerShell
$env:DB_PASSWORD = "your_password"
```

> ตาราง (tables) จะถูกสร้าง/อัปเดตอัตโนมัติจาก `spring.jpa.hibernate.ddl-auto=update`

### 2. ติดตั้ง dependencies
```bash
npm install
cd finance-frontend && npm install
```

### 3. รันโปรเจค
```bash
# รันทั้ง backend + frontend พร้อมกัน
npm run dev

# หรือรันแยกกัน
npm run backend    # Spring Boot -> http://localhost:8081
npm run frontend   # Vite dev server -> http://localhost:5173
```

- **Backend API:** http://localhost:8081/finance-app
- **Frontend:** http://localhost:5173

---

## 📝 Notes
- Backend รันที่พอร์ต **8081** (ตั้งค่าใน `application.properties`)
- CORS เปิดให้เรียกจากทุก origin (`@CrossOrigin(origins = "*")`) เหมาะสำหรับ development
- การลบธุรกรรมเป็นแบบ **Soft Delete** (ไม่ได้ลบข้อมูลจริงออกจากฐานข้อมูล)
