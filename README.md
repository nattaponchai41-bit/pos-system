# POS System

ระบบ POS สำหรับร้านค้าทั่วไป ออกแบบให้ติดตั้งและใช้งานบน Windows แบบ Offline ได้ โดยใช้ Next.js + MySQL/MariaDB (XAMPP)

## Technology Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4 + shadcn/ui
- Prisma 7 ORM + MariaDB driver adapter
- NextAuth.js v4 (Credentials)
- MySQL/MariaDB ผ่าน XAMPP

## ขั้นตอนติดตั้งสำหรับลูกค้า / Production

### 1. ติดตั้ง XAMPP

- ดาวน์โหลดและติดตั้ง [XAMPP](https://www.apachefriends.org/) บน Windows
- เปิดใช้งาน **MySQL** จาก XAMPP Control Panel
- สร้าง Database ชื่อ `pos_system`:

```powershell
C:\xampp\mysql\bin\mysql.exe -u root -e "CREATE DATABASE IF NOT EXISTS pos_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 2. ตั้งค่าไฟล์ .env

- คัดลอก `.env.example` เป็น `.env`
- แก้ไขค่าให้ตรงกับ MySQL ของคุณ:

```env
DATABASE_URL="mysql://root:@localhost:3306/pos_system"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="change-me-in-production"
```

> **แนะนำ:** เปลี่ยน `NEXTAUTH_SECRET` เป็นค่าสุ่มยาว ๆ ใน production

### 3. ติดตั้งระบบ

วิธีที่ 1 — รันสคริปต์อัตโนมัติ:

```powershell
cd scripts
.\setup.bat
```

วิธีที่ 2 — ติดตั้งเอง:

```powershell
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run build
```

### 4. เริ่มต้นใช้งานครั้งแรก

รันเซิร์ฟเวอร์:

```powershell
cd scripts
.\start.bat
```

หรือรันด้วย:

```powershell
npm run start
```

เปิดเบราว์เซอร์ที่ **http://localhost:3000/install** แล้วกรอกข้อมูล:

- ชื่อร้าน / ที่อยู่ร้าน / เบอร์โทร / เลขผู้เสียภาษี
- อีเมลและรหัสผ่าน Admin
- วิธีการชำระเงินที่ต้องการเปิดใช้งาน
- บัญชีธนาคารสำหรับรับโอน (ถ้ามี)
- เบอร์ PromptPay สำหรับสร้าง QR Code (ถ้ามี)

หลังติดตั้งเสร็จ ระบบจะพาไปหน้า Login เข้าด้วยอีเมล/รหัสผ่านที่ตั้งไว้

### 5. ตั้งค่าแบ็กอัปฐานข้อมูล (สำคัญมาก)

แบ็กอัปด้วยมือ:

```powershell
cd scripts
.\backup.bat
```

ตั้งแบ็กอัปอัตโนมัติทุกวัน (เปิด PowerShell ด้วยสิทธิ Admin):

```powershell
cd scripts
.\schedule-backup-task.ps1 -Time "23:00" -ExtraCopyDir "D:\\POS-Backup"
```

> แนะนำให้ตั้ง `ExtraCopyDir` เป็นไดรฟ์สำรองหรือโฟลเดอร์ OneDrive/Google Drive เผื่อคอมพัง

## ขั้นตอนติดตั้งสำหรับการพัฒนา

```powershell
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

จากนั้นเปิด http://localhost:3000/install เพื่อตั้งค่าระบบครั้งแรก

## โครงสร้างโปรเจกต์

- `prisma/schema.prisma` — โมเดลฐานข้อมูล
- `src/lib/` — Auth, API helpers, validation, business services
- `src/app/api/` — API Routes
- `src/app/(dashboard)/` — หน้าหลังเข้าสู่ระบบ
- `src/app/install/` — หน้าติดตั้งครั้งแรก
- `src/app/pos/` — หน้าขาย POS
- `scripts/` — สคริปต์ติดตั้ง รันเซิร์ฟเวอร์ แบ็กอัป และกู้คืน
- `src/generated/prisma/` — Prisma Client (สร้างอัตโนมัติ)

## สิทธิ์เริ่มต้น

- OWNER — ทุกสิทธิ์
- ADMIN — ทุกสิทธิ์
- MANAGER — ขาย ยกเลิกบิล ส่วนลด เปลี่ยนราคา จัดการสินค้า/หมวดหมู่ ปรับ Stock รับชำระหนี้ จัดการลูกค้า Session รายงาน
- CASHIER — ขาย ส่วนลด จัดการลูกค้า รับชำระหนี้ Session
- STOCK — จัดการสินค้า/หมวดหมู่ ปรับ Stock ดูต้นทุน รายงาน

## หมายเหตุสำคัญ

- Prisma 7 ต้องใช้ Driver Adapter จึงใช้ `@prisma/adapter-mariadb` + `mariadb` เพื่อเชื่อมต่อ MySQL
- ระบบรองรับการทำงานแบบ Offline บน Windows โดยใช้ XAMPP เป็น MySQL/MariaDB Server
- กรุณาตั้งแบ็กอัปฐานข้อมูลสม่ำเสมอ เพื่อป้องกันข้อมูลสูญหายเมื่อคอมพิวเตอร์เสีย
