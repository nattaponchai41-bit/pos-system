@echo off
chcp 65001 >nul
title POS System - Apply ZIP Update
color 0F
setlocal EnableDelayedExpansion

set "APP_DIR=%~dp0.."
cd /d "%APP_DIR%"

set "ZIP_FILE=%~1"
set "LOG_DIR=%APP_DIR%\logs"
set "BACKUP_DIR=%APP_DIR%\backups"
set "DB_NAME=pos_system"
set "DB_USER=root"
set "DB_PASS="

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

cls
echo.
echo  ===========================================
echo  POS System - Apply ZIP Update
echo  ===========================================
echo.

if "%ZIP_FILE%"=="" (
    echo  ERROR: Please provide the ZIP file path.
    echo  Usage: scripts\apply-zip-update.bat "C:\path\to\pos-system-vx.x.x.zip"
    pause
    exit /b 1
)

if not exist "%ZIP_FILE%" (
    echo  ERROR: ZIP file not found: %ZIP_FILE%
    pause
    exit /b 1
)

REM Read DB credentials from .env if exists
if exist "%APP_DIR%\.env" (
    for /f "usebackq tokens=*" %%a in ("%APP_DIR%\.env") do (
        set "LINE=%%a"
        if /I "!LINE:~0,12!"=="DATABASE_URL" (
            for /f "tokens=2 delims==" %%b in ("%%a") do (
                set "URL=%%b"
                set "URL=!URL:"=!"
                set "URL=!URL:mysql://=!"
                for /f "tokens=1 delims=@" %%c in ("!URL!") do (
                    for /f "tokens=1,2 delims=:" %%d in ("%%c") do (
                        set "DB_USER=%%d"
                        set "DB_PASS=%%e"
                    )
                )
                for /f "tokens=2 delims=/" %%c in ("!URL!") do (
                    for /f "tokens=1 delims=?" %%d in ("%%c") do set "DB_NAME=%%d"
                )
            )
        )
    )
)

if exist "%APP_DIR%\mysql-password.txt" (
    set /p DB_PASS=<"%APP_DIR%\mysql-password.txt"
)

>> "%LOG_DIR%\zip-update.log" echo.
>> "%LOG_DIR%\zip-update.log" echo ========================================
>> "%LOG_DIR%\zip-update.log" echo ZIP Update - %date% %time%
>> "%LOG_DIR%\zip-update.log" echo ========================================

REM Check MySQL
echo [1/6] Checking MySQL...
call scripts\check-mysql.bat >"%LOG_DIR%\mysql-check.log" 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: MySQL not running.
    type "%LOG_DIR%\mysql-check.log"
    pause
    exit /b 1
)
set /p MYSQL_BIN=<"%LOG_DIR%\mysql-check.log"

REM Backup database
echo [2/6] Backing up database...
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
call scripts\backup-db.bat "%MYSQL_BIN%" "%DB_NAME%" "%DB_USER%" "%DB_PASS%" "%BACKUP_DIR%" >"%LOG_DIR%\backup-path.log" 2>"%LOG_DIR%\backup-error.log"
if %errorlevel% neq 0 (
    echo  ERROR: Backup failed. Update cancelled.
    type "%LOG_DIR%\backup-error.log"
    pause
    exit /b 1
)
set /p DUMP_FILE=<"%LOG_DIR%\backup-path.log"
echo  Backup saved: %DUMP_FILE%
>> "%LOG_DIR%\zip-update.log" echo Backup: %DUMP_FILE%

REM Extract ZIP over existing app
echo [3/6] Extracting ZIP update...
set "ZIP_TOOL="
if exist "C:\Program Files\7-Zip\7z.exe" set "ZIP_TOOL=C:\Program Files\7-Zip\7z.exe"
if exist "C:\Program Files (x86)\7-Zip\7z.exe" set "ZIP_TOOL=C:\Program Files (x86)\7-Zip\7z.exe"

if "%ZIP_TOOL%"=="" (
    echo  ERROR: 7-Zip not found.
    echo  Please install 7-Zip from https://www.7-zip.org/
    pause
    exit /b 1
)

"%ZIP_TOOL%" x -y "%ZIP_FILE%" -o"%APP_DIR%" >"%LOG_DIR%\zip-extract.log" 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: Failed to extract ZIP.
    type "%LOG_DIR%\zip-extract.log"
    pause
    exit /b 1
)
echo  OK - ZIP extracted.

REM Install dependencies
echo [4/6] Installing dependencies...
npm install >"%LOG_DIR%\npm-install.log" 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: npm install failed.
    echo  See logs\npm-install.log
    pause
    exit /b 1
)
echo  OK - Dependencies installed.

REM Generate Prisma and update schema
echo [5/6] Updating database schema (no data loss)...
npx.cmd prisma generate >"%LOG_DIR%\prisma-generate.log" 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: prisma generate failed.
    echo  See logs\prisma-generate.log
    pause
    exit /b 1
)

npx.cmd prisma migrate deploy >"%LOG_DIR%\prisma-migrate.log" 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: prisma migrate deploy failed.
    echo  Your data is safe because a backup was created first.
    echo  See logs\prisma-migrate.log
    pause
    exit /b 1
)
echo  OK - Database schema updated.

REM Build production
echo [6/6] Building production...
npm run build >"%LOG_DIR%\npm-build.log" 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: npm run build failed.
    echo  See logs\npm-build.log
    pause
    exit /b 1
)
echo  OK - Build completed.

REM Restart POS
echo.
echo  Restarting POS System...
wmic process where "name='node.exe' AND CommandLine LIKE '%%%APP_DIR%%%'" delete >nul 2>&1
timeout /t 3 /nobreak >nul
start "" "%APP_DIR%\scripts\start-pos.bat"

echo.
echo  ===========================================
echo  ZIP update applied successfully!
echo  ===========================================
echo.
echo  Backup: %DUMP_FILE%
echo  Log:    %LOG_DIR%\zip-update.log
echo.
echo  Opening POS System...
start "" "http://localhost:3000"

pause
exit /b 0
