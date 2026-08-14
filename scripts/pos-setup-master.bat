@echo off
chcp 65001 >nul
title POS System - Master Setup
color 0F
setlocal EnableDelayedExpansion

set "APP_DIR=%~dp0.."
cd /d "%APP_DIR%"

if not exist "%APP_DIR%\logs" mkdir "%APP_DIR%\logs"

cls
echo.
echo  ===========================================
echo  POS System - Master Setup
echo  ===========================================
echo.

REM Check Node.js first
echo [1/4] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: Node.js not found.
    echo  Please install Node.js LTS from https://nodejs.org/
    pause
    exit /b 1
)
echo  OK - Node.js found.

REM Check / install XAMPP
echo [2/4] Checking XAMPP...
if exist "C:\xampp\mysql\bin\mysql.exe" (
    echo  OK - XAMPP already installed.
) else (
    echo  XAMPP not found.
    echo.
    echo  Please make sure xampp-installer.exe is in the same folder as POS-System-Setup.exe
    echo  or download XAMPP from https://www.apachefriends.org/
    echo.
    set "XAMPP_INSTALLER=%APP_DIR%\xampp-installer.exe"
    if not exist "!XAMPP_INSTALLER!" (
        echo  Searching for xampp-installer.exe in parent folders...
        for /f "delims=" %%a in ('dir /B /S "%~dp0..\..\xampp-installer.exe" 2^>nul') do set "XAMPP_INSTALLER=%%a"
    )
    if not exist "!XAMPP_INSTALLER!" (
        for /f "delims=" %%a in ('dir /B /S "C:\xampp-installer.exe" 2^>nul') do set "XAMPP_INSTALLER=%%a"
    )
    if not exist "!XAMPP_INSTALLER!" (
        echo  ERROR: xampp-installer.exe not found.
        echo  Please download XAMPP installer and place it next to POS-System-Setup.exe
        pause
        exit /b 1
    )
    echo  Found XAMPP installer at: !XAMPP_INSTALLER!
    call scripts\install-xampp.bat "!XAMPP_INSTALLER!" >"%APP_DIR%\logs\xampp-install.log" 2>&1
    if %errorlevel% neq 0 (
        echo  ERROR: XAMPP installation failed.
        echo  See logs\xampp-install.log
        pause
        exit /b 1
    )
    echo  OK - XAMPP installed.
)

REM Start MySQL
echo [3/4] Starting MySQL...
call scripts\start-xampp-mysql.bat >"%APP_DIR%\logs\mysql-start.log" 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: Could not start MySQL.
    type "%APP_DIR%\logs\mysql-start.log"
    pause
    exit /b 1
)
type "%APP_DIR%\logs\mysql-start.log"
echo  OK - MySQL ready.

REM Run POS setup
echo [4/4] Setting up POS System...
call scripts\setup-simple.bat
if %errorlevel% neq 0 (
    echo  ERROR: POS setup failed.
    pause
    exit /b 1
)

echo.
echo  ===========================================
echo  All steps completed successfully!
echo  ===========================================
echo.
pause
exit /b 0
