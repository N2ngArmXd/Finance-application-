# Deploy ขึ้นใช้งานจริง (ฟรี): Vercel + Render + Neon

```
ผู้ใช้ → Vercel (frontend) ──/api/*──▶ Render (Spring Boot) ──▶ Neon (PostgreSQL)
```

- **Vercel** — หน้าเว็บ (`finance-frontend`)
- **Render** — backend (`finance-backend`, build จาก `Dockerfile`)
- **Neon** — ฐานข้อมูล PostgreSQL

ทั้ง 3 เจ้าสมัครด้วยบัญชี GitHub ได้ · ในเครื่องไม่ต้องติดตั้ง Docker · dev ในเครื่องใช้ `npm run dev` เหมือนเดิม

ทำตามลำดับ **Neon → Render → Vercel** (แต่ละขั้นต้องใช้ค่าจากขั้นก่อนหน้า)

---

## 0. เตรียม secret (ทำครั้งเดียว)

เปิด **Git Bash** แล้วรัน 2 คำสั่งนี้ จดค่าที่ได้ไว้ (ห้าม commit ลง git):

```bash
openssl rand -base64 64   # → JWT_SECRET
openssl rand -base64 32   # → PASSWORD_ENC_KEY
```

> `PASSWORD_ENC_KEY` ตอนนี้ใช้แค่กับ migration เก่า แต่แอปจะไม่ start ถ้าไม่ได้ตั้ง — ใส่ค่าสุ่มไว้

---

## 1. Neon — ฐานข้อมูล

1. สมัครที่ https://neon.tech → **Create project**
   - Region: เลือก **Singapore** (ใกล้ไทยที่สุด)
2. หน้า Dashboard → **Connect** → จะได้ connection string หน้าตาแบบนี้:
   ```
   postgresql://neondb_owner:รหัสผ่าน@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
3. แยกเป็น 3 ค่าสำหรับ Render (**ต้องแปลงรูปแบบ** ห้าม copy ตรงๆ):

   | ตัวแปร | ค่า |
   |---|---|
   | `DB_URL` | `jdbc:postgresql://ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?currentSchema="finance-app"&sslmode=require` |
   | `DB_USERNAME` | `neondb_owner` |
   | `DB_PASSWORD` | รหัสผ่านใน connection string |

   - ขึ้นต้นด้วย `jdbc:postgresql://` และ **ไม่มี** `user:password@` ใน URL
   - ใช้ host ตัวที่ **ไม่มี** `-pooler`
   - ถ้ามี `&channel_binding=require` ให้ตัดทิ้ง

schema `finance-app` และตารางทั้งหมด backend จะสร้างให้เองตอน start ครั้งแรก

---

## 2. Render — backend

1. สมัครที่ https://render.com (ด้วย GitHub) → **New → Web Service** → เลือก repo นี้
2. ตั้งค่า:

   | ช่อง | ค่า |
   |---|---|
   | Region | **Singapore** |
   | Branch | `master` |
   | Root Directory | `finance-backend` |
   | Language / Runtime | **Docker** |
   | Instance Type | **Free** |

3. **Environment Variables** ใส่:

   | ตัวแปร | ค่า |
   |---|---|
   | `DB_URL` | จากขั้นที่ 1 |
   | `DB_USERNAME` | จากขั้นที่ 1 |
   | `DB_PASSWORD` | จากขั้นที่ 1 |
   | `JWT_SECRET` | จากขั้นที่ 0 |
   | `PASSWORD_ENC_KEY` | จากขั้นที่ 0 |
   | `COOKIE_SECURE` | `true` |

   (`PORT` ไม่ต้องใส่ — Render ตั้งให้เอง)

4. กด **Deploy** → รอ build ประมาณ 5–10 นาที (ครั้งแรกนานสุด) ดูใน **Logs** จนเห็น `Started FinanceAppApplication`
5. จด URL ของ service เช่น `https://finance-backend-xxxx.onrender.com`

---

## 3. Vercel — frontend

1. แก้ไฟล์ [`finance-frontend/vercel.json`](finance-frontend/vercel.json): เปลี่ยน `YOUR-RENDER-SERVICE.onrender.com` เป็น URL จากขั้นที่ 2 (ไม่ต้องมี `/` ท้าย) → commit + merge เข้า `master`
2. สมัครที่ https://vercel.com (ด้วย GitHub) → **Add New → Project** → import repo นี้
3. ตั้งค่า:

   | ช่อง | ค่า |
   |---|---|
   | Root Directory | `finance-frontend` |
   | Framework Preset | Vite (เลือกให้เอง) |

   ไม่ต้องใส่ environment variable
4. กด **Deploy** → ได้ URL เช่น `https://finance-xxxx.vercel.app` — **ให้ผู้ใช้เข้าที่ URL นี้**

---

## 4. ทดสอบ

1. เปิด URL ของ Vercel → สมัครสมาชิก → login
2. ลองเพิ่มรายรับ/รายจ่าย แล้ว refresh หน้า ข้อมูลต้องยังอยู่

ถ้าครั้งแรกโหลดนาน/error ให้รอ 1 นาทีแล้ว refresh — Render ฟรีกำลังตื่นจากหลับ

---

## อัปเดตเวอร์ชัน

merge PR เข้า `master` → Vercel และ Render build + deploy ใหม่เอง
- เวอร์ชันพัง → กด **Rollback** ในหน้า Deploys ของ Render / Vercel
- ก่อนอัปเดตที่เปลี่ยนโครงสร้าง entity (ลบ/เปลี่ยนชื่อคอลัมน์) → backup ก่อน (Neon มี restore ย้อนหลังแบบจำกัดเวลาในแพ็กเกจฟรี หรือใช้ `pg_dump`)
- `ddl-auto=update` เพิ่มตาราง/คอลัมน์ให้เอง แต่ **ไม่ลบ/ไม่ย้ายข้อมูล**

## ข้อจำกัดของแพ็กเกจฟรี

- **Render หลับเมื่อไม่มีคนใช้ 15 นาที** → คนแรกรอ ~1 นาที
  - ไม่อยากให้หลับ: ตั้ง https://cron-job.org (ฟรี) ให้เรียก `https://<render-url>/` ทุก 10 นาที (750 ชม./เดือนพอสำหรับ service เดียวเปิดทั้งเดือน)
- **Neon ฟรี 0.5GB** — แอปนี้ใช้ไม่ถึง 10 คนเหลือเฟือ
- ราคา/เงื่อนไขอาจเปลี่ยน — เช็กหน้า pricing ของแต่ละเจ้า

## ปัญหาที่เจอบ่อย

| อาการ | สาเหตุ / วิธีแก้ |
|---|---|
| Render log: `PASSWORD_ENC_KEY ต้องเป็น base64...` | ยังไม่ได้ใส่ / ใส่ค่าผิด → สร้างใหม่ตามขั้นที่ 0 |
| Render log: `Connection refused` / `password authentication failed` | `DB_URL` ผิดรูปแบบ หรือ user/password ไม่ตรง → ดูขั้นที่ 1 ข้อ 3 |
| login สำเร็จแต่เด้งกลับหน้า login | `COOKIE_SECURE` ไม่ใช่ `true` หรือเข้าเว็บผ่าน URL ของ Render ตรงๆ (ต้องเข้าผ่าน Vercel) |
| หน้าเว็บขึ้น แต่ทุกอย่าง error 404 | `vercel.json` ยังเป็น `YOUR-RENDER-SERVICE` หรือ URL ผิด |
