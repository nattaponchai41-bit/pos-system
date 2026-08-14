@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

title POS System - Auto Update
cd /d "%~dp0"

set "APP_DIR=%CD%"
set "LOG_FILE=%APP_DIR%\update.log"
set "BACKUP_DIR=%APP_DIR%\backups"
set "DB_NAME=pos_system"
set "DB_USER=root"
set "DB_PASS="

REM Read DB credentials from .env if exists
if exist "%APP_DIR%\.env" (
    for /f "usebackq tokens=*" %%a in ("%APP_DIR%\.env") do (
        set "LINE=%%a"
        if /I "!LINE:~0,12!"=="DATABASE_URL" (
            REM parse mysql://USER:PASS@HOST:PORT/DB_NAME
            for /f "tokens=2 delims==" %%b in ("%%a") do (
                set "URL=%%b"
                set "URL=!URL:"=!"
                REM Remove mysql:// prefix
                set "URL=!URL:mysql://=!"
                REM Get user:pass part before @
                for /f "tokens=1 delims=@" %%c in ("!URL!") do (
                    for /f "tokens=1,2 delims=:" %%d in ("%%c") do (
                        set "DB_USER=%%d"
                        set "DB_PASS=%%e"
                    )
                )
                REM Remove trailing / and params to get DB name
                for /f "tokens=2 delims=/" %%c in ("!URL!") do (
                    for /f "tokens=1 delims=?" %%d in ("%%c") do set "DB_NAME=%%d"
                )
            )
        )
    )
)

>> "%LOG_FILE%" echo.
>> "%LOG_FILE%" echo ========================================
>> "%LOG_FILE%" echo POS System Auto Update - %date% %time%
>> "%LOG_FILE%" echo ========================================

echo [1/8] Checking MySQL status...
call scripts\check-mysql.bat >tmp_mysql.txt
if %errorlevel% neq 0 (
    type tmp_mysql.txt
    echo ERROR: MySQL is not running. Start XAMPP MySQL first.
    >> "%LOG_FILE%" echo ERROR: MySQL not running
    del tmp_mysql.txt >nul 2>&1
    pause
    exit /b 1
)
set /p MYSQL_BIN=<tmp_mysql.txt
del tmp_mysql.txt >nul 2>&1
>> "%LOG_FILE%" echo MySQL found: %MYSQL_BIN%

echo [2/8] Checking git repository...
if not exist "%APP_DIR%\.git" (
    echo ERROR: This folder is not a git repository.
    echo Please run: git clone https://github.com/nattaponchai41-bit/pos-system.git
    >> "%LOG_FILE%" echo ERROR: Not a git repo
    pause
    exit /b 1
)

echo [3/8] Backing up database before update...
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
call scripts\backup-db.bat "%MYSQL_BIN%" "%DB_NAME%" "%DB_USER%" "%DB_PASS%" "%BACKUP_DIR%" >tmp_backup.txt
if %errorlevel% neq 0 (
    echo ERROR: Database backup failed. Update cancelled.
    type tmp_backup.txt
    >> "%LOG_FILE%" echo ERROR: Backup failed
    del tmp_backup.txt >nul 2>&1
    pause
    exit /b 1
)
set /p DUMP_FILE=<tmp_backup.txt
del tmp_backup.txt >nul 2>&1
echo Backup saved: %DUMP_FILE%
>> "%LOG_FILE%" echo Backup saved: %DUMP_FILE%

echo [4/8] Pulling latest code from GitHub...
git config --global --add safe.directory "%APP_DIR%" >nul 2>&1
git status --short >tmp_status.txt
for %%I in (tmp_status.txt) do set /a SIZE=%%~zI
if %SIZE% gtr 0 (
    echo Local changes detected. Stashing before pull...
    git stash push -m "auto-update-stash-%date%-%time%" >> "%LOG_FILE%" 2>&1
    if %errorlevel% neq 0 (
        echo ERROR: Failed to stash local changes.
        >> "%LOG_FILE%" echo ERROR: Stash failed
        del tmp_status.txt >nul 2>&1
        pause
        exit /b 1
    )
)
del tmp_status.txt >nul 2>&1

git pull origin master >> "%LOG_FILE%" 2>&1
if %errorlevel% neq 0 (
    echo ERROR: git pull failed. Check internet / GitHub access.
    >> "%LOG_FILE%" echo ERROR: git pull failed
    pause
    exit /b 1
)
echo Code updated successfully.

echo [5/8] Installing dependencies...
npm install >> "%LOG_FILE%" 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm install failed.
    >> "%LOG_FILE%" echo ERROR: npm install failed
    pause
    exit /b 1
)

echo [6/8] Updating database schema...
npx.cmd prisma migrate deploy >> "%LOG_FILE%" 2>&1
if %errorlevel% neq 0 (
    echo ERROR: prisma migrate deploy failed.
    >> "%LOG_FILE%" echo ERROR: migrate deploy failed
    pause
    exit /b 1
)

echo [7/8] Generating Prisma client and building...
npx.cmd prisma generate >> "%LOG_FILE%" 2>&1
npm run build >> "%LOG_FILE%" 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm run build failed.
    >> "%LOG_FILE%" echo ERROR: build failed
    pause
    exit /b 1
)

echo [8/8] Restarting POS System...
>> "%LOG_FILE%" echo Restarting POS System
wmic process where "name='node.exe' AND CommandLine LIKE '%%%APP_DIR%%%'" delete >nul 2>&1
timeout /t 3 /nobreak >nul
start "" /min "%APP_DIR%\scripts\start-pos.bat"

echo.
echo ========================================
echo Update completed successfully
echo ========================================
echo Log file: %LOG_FILE%
echo.
pause
exit /b 0
