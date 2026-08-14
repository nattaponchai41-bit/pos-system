@echo off
chcp 65001 >nul
title POS System Server
color 0F
setlocal EnableDelayedExpansion

REM Wait for MySQL to be ready (max 60 seconds)
set "MYSQL_BIN="
if exist "C:\xampp\mysql\bin\mysql.exe" set "MYSQL_BIN=C:\xampp\mysql\bin\mysql.exe"
if "%MYSQL_BIN%"=="" (
    for /f "delims=" %%a in ('dir /B /S "C:\xampp\mysql\bin\mysql.exe" 2^>nul') do set "MYSQL_BIN=%%a"
)

if not "%MYSQL_BIN%"=="" (
    echo Waiting for MySQL...
    set /a COUNT=0
    :WAIT_MYSQL
    "%MYSQL_BIN%" --host=localhost --port=3306 --user=root -e "SELECT 1;" >nul 2>&1
    if %errorlevel% neq 0 (
        timeout /t 2 /nobreak >nul
        set /a COUNT+=1
        if !COUNT! lss 30 goto WAIT_MYSQL
    )
)

cd /d "%~dp0.."
echo.
echo  ===========================================
echo  Starting POS System at http://localhost:3000
echo  ===========================================
echo.
echo  Do not close this window while POS is running.
echo.
npm run start

echo.
echo  Server stopped. Press any key to close.
pause
