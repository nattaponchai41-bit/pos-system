# คู่มือติดตั้ง POS System บนเครื่องลูกค้า (เครื่องใหม่ / Windows)

คู่มือนี้เขียนสำหรับช่าง/ผู้ติดตั้ง ใช้งานบน Windows 10/11 เครื่องเปล่าที่ยังไม่มี Node.js, Git, หรือฐานข้อมูล

คำสั่งในคู่มือนี้เป็น **PowerShell** เปิด PowerShell แล้ว copy/paste ได้เลย ถ้าเครื่องไม่ให้รัน npm/npx ให้ใช้ `npm.cmd` / `npx.cmd` ตามตัวอย่าง

---

## สิ่งที่ต้องติดตั้งก่อน (ต้องทำ)

### 1. Node.js LTS

- ดาวน์โหลดจาก https://nodejs.org/
- เลือก LTS (แนะนำ 20.x ขึ้นไป)
- ติดตั้งด้วยค่าเริ่มต้นทั้งหมด
- เปิด PowerShell ใหม่แล้วเช็ค:

```powershell
node -v
npm -v
```

ถ้าขึ้นเวอร์ชัน = สำเร็จ

### 2. Git for Windows

- ดาวน์โหลดจาก https://git-scm.com/download/win
- ติดตั้งด้วยค่าเริ่มต้นทั้งหมด
- เช็คใน PowerShell:

```powershell
git --version
```

ถ้าไม่ได้โคลนผ่าน git ให้ข้ามขั้นตอน git แล้วใช้ไฟล์ ZIP แทน

### 3. XAMPP (ฐานข้อมูล MariaDB)

- ดาวน์โหลดจาก https://www.apachefriends.org/
- ติดตั้งเฉพาะ **MySQL** และ **phpMyAdmin**
- เปิด **XAMPP Control Panel** แล้วกด **Start** ที่ MySQL

---

## ขั้นตอนหลัก

### ขั้นตอน A: นำโปรเจกต์เข้าเครื่อง (ต้องทำ)

#### A.1 โคลนจาก git (ทำเฉพาะกรณีได้โคลนจาก git)

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\Documents\pos-system"
Set-Location "$env:USERPROFILE\Documents\pos-system"
git clone https://github.com/your-org/pos-system.git .
```

เปลี่ยน URL ตามที่มีจริง

#### A.2 ใช้ไฟล์ ZIP (ทำเฉพาะกรณีส่งเป็นไฟล์ ZIP)

- แตกไฟล์ ZIP ไปที่ `C:\Users\<ชื่อผู้ใช้>\Documents\pos-system`
- เปิด PowerShell แล้วเข้าโฟลเดอร์:

```powershell
Set-Location "$env:USERPROFILE\Documents\pos-system"
```

---

### ขั้นตอน B: ติดตั้ง dependencies (ต้องทำ)

```powershell
Set-Location "$env:USERPROFILE\Documents\pos-system"
npm install
```

รอจนเสร็จ ห้ามข้ามขั้นตอนนี้

---

### ขั้นตอน C: สร้างฐานข้อมูล (ต้องทำ)

1. เปิดเบราว์เซอร์ไปที่ http://localhost/phpmyadmin
2. คลิก **New** หรือ **Databases**
3. ใส่ชื่อ `pos_system`
4. คลิก **Create**

---

### ขั้นตอน D: สร้างไฟล์ `.env` (ต้องทำ)

ในโฟลเดอร์ `pos-system` สร้างไฟล์ `.env` แล้วใส่ข้อความด้านล่างนี้

ถ้า MariaDB ไม่มีรหัสผ่าน root:

```env
DATABASE_URL="mysql://root:@localhost:3306/pos_system"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="change-me-in-production"
```

ถ้า MariaDB มีรหัสผ่าน root ให้ใส่รหัสใน connection string:

```env
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/pos_system"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="change-me-in-production"
```

ใน production ควรเปลี่ยน `NEXTAUTH_SECRET` เป็นค่าสุ่มยาว ๆ

---

### ขั้นตอน E: สร้างตารางและข้อมูลเริ่มต้น (ต้องทำ)

รันทีละบรรทัด รอให้เสร็จก่อนรันบรรทัดถัดไป

```powershell
Set-Location "$env:USERPROFILE\Documents\pos-system"
npx.cmd prisma generate
npx.cmd prisma migrate deploy
npm run db:seed
```

คำอธิบาย:
- `prisma generate` = สร้าง Prisma Client
- `prisma migrate deploy` = สร้าง/อัปเดตตารางในฐานข้อมูล (ไม่ทำลายข้อมูลเดิม)
- `db:seed` = ใส่ข้อมูลเริ่มต้น เช่น บทบาท สิทธิ์ ผู้ใช้ หน่วย หมวดหมู่ การตั้งค่า

> **ห้ามใช้ `npx prisma migrate reset` บนเครื่องลูกค้า** เพราะจะลบข้อมูลทั้งหมด

---

## โหมด Development (ทำเฉพาะกรณีต้องการทดสอบหรือพัฒนา)

```powershell
Set-Location "$env:USERPROFILE\Documents\pos-system"
npm run dev
```

แล้วเปิดเบราว์เซอร์ที่ http://localhost:3000

ในโหมดนี้จะ hot-reload เมื่อแก้ไขโค้ด

---

## โหมด Production (ต้องทำสำหรับใช้งานจริง)

```powershell
Set-Location "$env:USERPROFILE\Documents\pos-system"
npm run build
npm run start
```

แล้วเปิดเบราว์เซอร์ที่ http://localhost:3000

---

## ข้อมูลเข้าสู่ระบบเริ่มต้น (ต้องทำ — เปลี่ยนรหัสผ่านหลังติดตั้ง)

| อีเมล | รหัสผ่าน | บทบาท |
|---|---|---|
| admin@pos.local | admin123 | ผู้ดูแลระบบ |
| cashier@pos.local | cashier123 | พนักงานขาย |
| stock@pos.local | stock123 | พนักงานสต็อก |

เข้าด้วย admin แล้วเปลี่ยนรหัสผ่านทุก account ทันที

---

## เปิดใช้งานทุกครั้งหลังปิดเครื่อง (ต้องทำ)

1. เปิด **XAMPP Control Panel**
2. กด **Start** ที่ **MySQL**
3. เปิด PowerShell:

```powershell
Set-Location "$env:USERPROFILE\Documents\pos-system"
npm run start
```

4. เปิดเบราว์เซอร์ http://localhost:3000

---

## การอัปเดตโปรแกรม (ทำเฉพาะกรณีมีเวอร์ชันใหม่)

### กรณีโคลนจาก git

```powershell
Set-Location "$env:USERPROFILE\Documents\pos-system"
git pull
npm install
npx.cmd prisma migrate deploy
npm run build
npm run start
```

### กรณีใช้ ZIP

1. สำรองไฟล์ `.env` ไว้
2. แตกไฟล์ ZIP เวอร์ชันใหม่ทับโฟลเดอร์เดิม
3. นำไฟล์ `.env` กลับมาวาง
4. รัน:

```powershell
Set-Location "$env:USERPROFILE\Documents\pos-system"
npm install
npx.cmd prisma migrate deploy
npm run build
npm run start
```

`prisma migrate deploy` จะอัปเดตตารางโดยไม่ทำลายข้อมูลเดิม

---

## แก้ไขปัญหาที่พบบ่อย (ทำเฉพาะกรณี)

### npm หรือ npx ถูก execution policy block

ให้ใช้ `.cmd` suffix:

```powershell
npm.cmd install
npm.cmd run build
npx.cmd prisma generate
npx.cmd prisma migrate deploy
```

หรือเปลี่ยน execution policy ชั่วคราว:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### `Error: Can't reach database server`

1. เช็คว่า XAMPP MySQL Start แล้ว
2. เช็ค `DATABASE_URL` ใน `.env` ว่าถูกต้อง
3. เช็คว่า database `pos_system` ถูกสร้างแล้ว

### พอร์ต 3000 ถูกใช้งานอยู่

ปิดโปรแกรมอื่น หรือรันด้วยพอร์ตอื่น:

```powershell
npm.cmd run dev -- --port 3001
```

หรือ

```powershell
npm.cmd run start -- -p 3001
```

### ลืมรหัสผ่าน admin

ให้รีเซ็ตผ่าน database หรือรัน seed ใหม่เฉพาะผู้ใช้ admin ห้าม reset database ทั้งหมด
