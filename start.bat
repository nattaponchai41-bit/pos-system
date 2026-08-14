@echo off
chcp 65001 >nul
title POS System - Start Server
color 0F
echo.
echo  ===========================================
echo  POS System - Start Server
echo  ===========================================
echo.
echo  Make sure XAMPP MySQL is running.
echo.
cd /d "%~dp0"
npm run start
echo.
echo  Server stopped. Press any key to close.
pause
