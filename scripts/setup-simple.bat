@echo off
chcp 65001 >nul
title POS System - One-Click Setup
color 0F
setlocal EnableDelayedExpansion

set "APP_DIR=%~dp0.."
cd /d "%APP_DIR%"

set "DB_NAME=pos_system"
set "DB_USER=root"
set "DB_PASS="
set "DB_HOST=localhost"
set "DB_PORT=3306"
set "NEXTAUTH_URL=http://localhost:3000"
set "LOG_DIR=%APP_DIR%\logs"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

cls
echo.
echo  ===========================================
echo  POS System - One-Click Setup
echo  ===========================================
echo.

REM Check Node.js
echo [1/8] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: Node.js not found.
    echo  Please install Node.js LTS from https://nodejs.org/
    pause
    exit /b 1
)
echo  OK - Node.js found.

REM Try to start MySQL if not running
echo [2/8] Checking MySQL/MariaDB...
call scripts\check-mysql.bat >"%LOG_DIR%\mysql-check.log" 2>&1
if %errorlevel% neq 0 (
    echo  MySQL not running. Trying to start XAMPP MySQL...
    call scripts\start-xampp-mysql.bat >"%LOG_DIR%\mysql-start.log" 2>&1
    timeout /t 5 /nobreak >nul
    call scripts\check-mysql.bat >"%LOG_DIR%\mysql-check.log" 2>&1
    if %errorlevel% neq 0 (
        type "%LOG_DIR%\mysql-check.log"
        echo.
        echo  ERROR: MySQL could not be started.
        echo  Please install XAMPP and start MySQL service manually.
        echo  Download: https://www.apachefriends.org/
        pause
        exit /b 1
    )
)
set /p MYSQL_BIN=<"%LOG_DIR%\mysql-check.log"
echo  OK - MySQL found at %MYSQL_BIN%

REM Test connection
echo [3/8] Testing database connection...
"%MYSQL_BIN%" --host=%DB_HOST% --port=%DB_PORT% --user=%DB_USER% -e "SELECT 1;" >nul 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: Cannot connect to MySQL as root with empty password.
    echo  If your MySQL root has a password, create this file and run setup again:
    echo    %APP_DIR%\mysql-password.txt
    pause
    exit /b 1
)
echo  OK - Connected to MySQL.

REM Check for custom root password
echo [4/8] Checking custom password...
if exist "%APP_DIR%\mysql-password.txt" (
    set /p DB_PASS=<"%APP_DIR%\mysql-password.txt"
    echo  Using password from mysql-password.txt
) else (
    echo  No custom password file. Using empty password.
)

REM Create database
echo [5/8] Creating database...
call scripts\create-db.bat "%MYSQL_BIN%" "%DB_NAME%" "%DB_USER%" "%DB_PASS%" >"%LOG_DIR%\create-db.log" 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: Failed to create database.
    type "%LOG_DIR%\create-db.log"
    pause
    exit /b 1
)
echo  OK - Database %DB_NAME% ready.

REM Configure MySQL max_connections
echo [6/8] Tuning MySQL for POS System...
call scripts\tune-mysql.bat "%MYSQL_BIN%" >"%LOG_DIR%\tune-mysql.log" 2>&1
if %errorlevel% neq 0 (
    echo  WARNING: Could not tune MySQL. You may need to set max_connections manually.
    type "%LOG_DIR%\tune-mysql.log"
) else (
    echo  OK - MySQL max_connections configured.
)

REM Create .env
echo [7/9] Creating .env file...
if exist "%APP_DIR%\.env" (
    echo  OK - .env already exists.
) else (
    for /f "tokens=*" %%a in ('node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"') do set "NEXTAUTH_SECRET=%%a"
    if "%DB_PASS%"=="" (
        echo DATABASE_URL="mysql://%DB_USER%:@%DB_HOST%:%DB_PORT%/%DB_NAME%?connection_limit=20" > "%APP_DIR%\.env"
    ) else (
        echo DATABASE_URL="mysql://%DB_USER%:%DB_PASS%@%DB_HOST%:%DB_PORT%/%DB_NAME%?connection_limit=20" > "%APP_DIR%\.env"
    )
    echo NEXTAUTH_URL="%NEXTAUTH_URL%" >> "%APP_DIR%\.env"
    echo NEXTAUTH_SECRET="%NEXTAUTH_SECRET%" >> "%APP_DIR%\.env"
    echo  OK - .env created.
)

REM Install dependencies and setup database
echo [8/10] Installing dependencies and setting up database...
npm install >"%LOG_DIR%\npm-install.log" 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: npm install failed.
    echo  See logs\npm-install.log
    pause
    exit /b 1
)

npx.cmd prisma generate >"%LOG_DIR%\prisma-generate.log" 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: prisma generate failed.
    echo  See logs\prisma-generate.log
    pause
    exit /b 1
)

call scripts\check-db-empty.bat "%MYSQL_BIN%" "%DB_NAME%" "%DB_USER%" "%DB_PASS%" >"%LOG_DIR%\db-table-count.log" 2>&1
set /p TABLE_COUNT=<"%LOG_DIR%\db-table-count.log"
if "%TABLE_COUNT%"=="" set "TABLE_COUNT=0"

npx.cmd prisma migrate deploy >"%LOG_DIR%\prisma-migrate.log" 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: prisma migrate deploy failed.
    echo  See logs\prisma-migrate.log
    pause
    exit /b 1
)

if %TABLE_COUNT% gtr 0 (
    echo  Database already has %TABLE_COUNT% tables. Skipping seed to protect data.
) else (
    echo  Seeding default data...
    npm run db:seed >"%LOG_DIR%\db-seed.log" 2>&1
    if %errorlevel% neq 0 (
        echo  ERROR: db:seed failed.
        echo  See logs\db-seed.log
        pause
        exit /b 1
    )
    echo  OK - Default data seeded.
)

REM Build production
echo [9/10] Building production application...
npm run build >"%LOG_DIR%\npm-build.log" 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: npm run build failed.
    echo  See logs\npm-build.log
    pause
    exit /b 1
)
echo  OK - Production build completed.

echo.
echo  ===========================================
echo  Setup completed successfully!
echo  ===========================================
echo.
echo  Starting POS System server...
echo.

start "" "%APP_DIR%\scripts\start-pos.bat"
timeout /t 8 /nobreak >nul

REM Open browser
echo  Opening browser...
start "" "http://localhost:3000"

pause
exit /b 0
