@echo off
chcp 65001 > nul
echo POS System - Setup
echo ==================

if not exist .env (
  echo กรุณาคัดลอก .env.example เป็น .env และตั้งค่า DATABASE_URL ก่อน
  exit /b 1
)

echo กำลังติดตั้ง dependencies...
call npm install

echo กำลังสร้าง Prisma client...
call npx prisma generate

echo กำลังรัน database migrations...
call npx prisma migrate deploy

echo กำลัง seed ข้อมูลเริ่มต้น...
call npm run db:seed

echo กำลัง build ระบบสำหรับ production...
call npm run build

echo.
echo ติดตั้งเสร็จสิ้น ให้รัน scripts\start.bat เพื่อเปิดเซิร์ฟเวอร์
pause
