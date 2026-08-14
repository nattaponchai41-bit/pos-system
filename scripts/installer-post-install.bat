@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

set "APP_DIR=%~1"
set "AUTO_START=%~2"

if "%APP_DIR%"=="" set "APP_DIR=%~dp0.."
cd /d "%APP_DIR%"

if not exist "%APP_DIR%\logs" mkdir "%APP_DIR%\logs"

echo.
echo  ===========================================
echo  POS System - Post Install Setup
echo  ===========================================
echo.
echo  This will:
echo    - Check Node.js and MySQL
echo    - Create database if not exists
echo    - Install dependencies
echo    - Setup database tables and seed default data
echo    - Build production application
echo    - Start POS System server
echo.
echo  Press any key to start...
pause >nul

REM Run one-click setup
call scripts\setup-simple.bat
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: Setup failed. Check logs in %APP_DIR%\logs
    pause
    exit /b 1
)

REM Configure auto-start if selected
if /I "%AUTO_START%"=="true" (
    echo  Configuring auto-start...
    call scripts\install-service.bat "%APP_DIR%" "true" >"%APP_DIR%\logs\service-install.log" 2>&1
)

echo.
echo  POS System is ready!
echo  Open browser at http://localhost:3000
echo.
pause
exit /b 0
