@echo off
chcp 65001 >nul
title POS System Setup
color 0F
setlocal EnableDelayedExpansion

REM =====================================================
REM POS System - Windows First-Time Setup
REM Use on clean machines only. Backup before reuse.
REM =====================================================

set "PROJECT_DIR=%~dp0"
set "DB_NAME=pos_system"
set "DB_USER=root"
set "DB_PASS="
set "DB_HOST=localhost"
set "DB_PORT=3306"
set "NEXTAUTH_URL=http://localhost:3000"
set "NEXTAUTH_SECRET=change-me-in-production"

cls
echo.
echo  ===========================================
echo  POS System - First-Time Setup (Windows)
echo  ===========================================
echo.
echo  Project folder: %PROJECT_DIR%
echo.

REM =====================================================
REM Check Node.js
REM =====================================================
echo [1/7] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo         ERROR: Node.js not found.
    echo         Download LTS from https://nodejs.org/
    echo         After install, open a new terminal and run setup.bat again.
    pause
    exit /b 1
)
for /f "tokens=*" %%a in ('node --version') do set NODE_VERSION=%%a
echo         OK - Node.js %NODE_VERSION%
echo.

REM =====================================================
REM Check npm
REM =====================================================
echo [2/7] Checking npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo         ERROR: npm not found. Please reinstall Node.js.
    pause
    exit /b 1
)
for /f "tokens=*" %%a in ('npm --version') do set NPM_VERSION=%%a
echo         OK - npm %NPM_VERSION%
echo.

REM =====================================================
REM Check Git (optional)
REM =====================================================
echo [3/7] Checking Git (optional)...
git --version >nul 2>&1
if %errorlevel% == 0 (
    for /f "tokens=*" %%a in ('git --version') do set GIT_VERSION=%%a
    echo         OK - %GIT_VERSION%
) else (
    echo         WARNING: Git not found. Skip if using ZIP.
)
echo.

REM =====================================================
REM Check MariaDB/MySQL
REM =====================================================
echo [4/7] Checking MariaDB/MySQL...
set "MYSQL_BIN="

if exist "C:\xampp\mysql\bin\mysql.exe" (
    set "MYSQL_BIN=C:\xampp\mysql\bin\mysql.exe"
) else if exist "C:\Program Files\MariaDB *\bin\mysql.exe" (
    for /f "delims=" %%a in ('dir /B /S "C:\Program Files\MariaDB *\bin\mysql.exe" 2^>nul') do set "MYSQL_BIN=%%a"
) else if exist "C:\Program Files\MySQL\MySQL Server *\bin\mysql.exe" (
    for /f "delims=" %%a in ('dir /B /S "C:\Program Files\MySQL\MySQL Server *\bin\mysql.exe" 2^>nul') do set "MYSQL_BIN=%%a"
)

if "%MYSQL_BIN%"=="" (
    echo         ERROR: mysql.exe not found.
    echo         Install XAMPP and start MySQL service.
    echo         Download: https://www.apachefriends.org/
    pause
    exit /b 1
)

echo         OK - Found %MYSQL_BIN%
echo.

REM Test MySQL connection
"%MYSQL_BIN%" --host=%DB_HOST% --port=%DB_PORT% --user=%DB_USER% -e "SELECT 1;" >nul 2>&1
if %errorlevel% neq 0 (
    echo         ERROR: Cannot connect to MySQL.
    echo         Please start MySQL in XAMPP Control Panel.
    pause
    exit /b 1
)
echo         OK - MySQL is running and reachable.
echo.

REM =====================================================
REM Ask for root password
REM =====================================================
echo [5/7] Database connection setup...
echo.
echo  Default: user=root, host=localhost, port=3306
echo  Leave empty if root has no password.
echo.
set /p DB_PASS_INPUT="Root password (if any): "
if not "%DB_PASS_INPUT%"=="" set "DB_PASS=%DB_PASS_INPUT%"
echo.

REM =====================================================
REM Create database
REM =====================================================
echo [6/7] Creating database if not exists...
if "%DB_PASS%"=="" (
    "%MYSQL_BIN%" --host=%DB_HOST% --port=%DB_PORT% --user=%DB_USER% -e "CREATE DATABASE IF NOT EXISTS %DB_NAME% CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" >nul 2>&1
) else (
    "%MYSQL_BIN%" --host=%DB_HOST% --port=%DB_PORT% --user=%DB_USER% --password=%DB_PASS% -e "CREATE DATABASE IF NOT EXISTS %DB_NAME% CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" >nul 2>&1
)

if %errorlevel% neq 0 (
    echo         ERROR: Failed to create database.
    echo         Check root password and permissions.
    pause
    exit /b 1
)
echo         OK - Database %DB_NAME% ready.
echo.

REM =====================================================
REM Create .env
REM =====================================================
echo [7/7] Creating .env file...
if exist "%PROJECT_DIR%.env" (
    echo         OK - .env already exists (not overwritten)
) else (
    if "%DB_PASS%"=="" (
        echo DATABASE_URL="mysql://%DB_USER%:@%DB_HOST%:%DB_PORT%/%DB_NAME%" > "%PROJECT_DIR%.env"
    ) else (
        echo DATABASE_URL="mysql://%DB_USER%:%DB_PASS%@%DB_HOST%:%DB_PORT%/%DB_NAME%" > "%PROJECT_DIR%.env"
    )
    echo NEXTAUTH_URL="%NEXTAUTH_URL%" >> "%PROJECT_DIR%.env"
    echo NEXTAUTH_SECRET="%NEXTAUTH_SECRET%" >> "%PROJECT_DIR%.env"
    echo         OK - .env created
)
echo.

REM =====================================================
REM Install dependencies
REM =====================================================
echo ===========================================
echo  Installing dependencies (npm install)...
echo ===========================================
cd /d "%PROJECT_DIR%"
npm install
if %errorlevel% neq 0 (
    echo.
    echo         ERROR: npm install failed.
    pause
    exit /b 1
)
echo.
echo         OK - Dependencies installed.
echo.

REM =====================================================
REM Generate Prisma Client
REM =====================================================
echo ===========================================
echo  Generating Prisma Client...
echo ===========================================
npx.cmd prisma generate
if %errorlevel% neq 0 (
    echo.
    echo         ERROR: prisma generate failed.
    pause
    exit /b 1
)
echo.
echo         OK - Prisma Client generated.
echo.

REM =====================================================
REM Deploy migrations (safe - does not destroy data)
REM =====================================================
echo ===========================================
echo  Deploying database migrations...
echo  Note: does NOT destroy existing data.
echo ===========================================
npx.cmd prisma migrate deploy
if %errorlevel% neq 0 (
    echo.
    echo         ERROR: prisma migrate deploy failed.
    echo         Check DATABASE_URL in .env
    pause
    exit /b 1
)
echo.
echo         OK - Database schema updated.
echo.

REM =====================================================
REM Seed initial data
REM =====================================================
echo ===========================================
echo  Seeding default data (roles, users, etc.)...
echo ===========================================
npm run db:seed
if %errorlevel% neq 0 (
    echo.
    echo         ERROR: db:seed failed.
    pause
    exit /b 1
)
echo.
echo         OK - Seed completed.
echo.

REM =====================================================
REM Create helper batch files
REM =====================================================
echo ===========================================
echo  Creating helper batch files...
echo ===========================================
(
echo @echo off
chcp 65001 >nul
title POS System
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
pause
) > "%PROJECT_DIR%start.bat"

echo         OK - start.bat created.

(
echo @echo off
chcp 65001 >nul
title POS System - Dev Mode
cd /d "%~dp0"
npm run dev
pause
) > "%PROJECT_DIR%dev.bat"

echo         OK - dev.bat created.

(
echo @echo off
chcp 65001 >nul
title POS System - Update
cd /d "%~dp0"
echo Updating dependencies...
npm install
echo Updating database schema (no data loss)...
npx.cmd prisma migrate deploy
echo Building production...
npm run build
echo.
echo Update complete. Run start.bat to start.
pause
) > "%PROJECT_DIR%update.bat"

echo         OK - update.bat created.
echo.

REM =====================================================
REM Build production
REM =====================================================
echo ===========================================
echo  Building for production...
echo ===========================================
npm run build
if %errorlevel% neq 0 (
    echo.
    echo         ERROR: npm run build failed.
    echo         Check errors above.
    pause
    exit /b 1
)
echo.
echo         OK - Production build completed.
echo.

REM =====================================================
REM Done
REM =====================================================
cls
echo.
echo  ===========================================
echo  POS System installed successfully.
echo  ===========================================
echo.
echo  Default login:
echo.
echo    Admin:   admin@pos.local / admin123
echo    Cashier: cashier@pos.local / cashier123
echo    Stock:   stock@pos.local / stock123
echo.
echo  How to run:
echo    1. Start MySQL in XAMPP Control Panel
echo    2. Double-click start.bat in this folder
echo    3. Open browser http://localhost:3000
echo.
echo  Helper files created:
echo    - start.bat  : run every day
echo    - dev.bat    : development mode (hot reload)
echo    - update.bat : update to new version
echo.
echo  Start now? (Y/N)
set /p START_NOW=""
if /I "%START_NOW%"=="Y" (
    cd /d "%PROJECT_DIR%"
    start start.bat
)
exit /b 0
