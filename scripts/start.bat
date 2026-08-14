@echo off
chcp 65001 > nul
echo POS System - Production Server
echo =================================

if not exist .env (
  echo กรุณาคัดลอก .env.example เป็น .env และตั้งค่า DATABASE_URL ก่อน
  exit /b 1
)

echo ตรวจสอบให้แน่ใจว่า XAMPP MySQL กำลังทำงาน และ migrations ถูกประยุกต์แล้ว
echo เปิดเบราว์เซอร์ที่ http://localhost:3000/install สำหรับการตั้งค่าครั้งแรก
echo.

call npm run start
