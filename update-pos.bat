@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

title POS System - Safe Update
color 0F
cd /d "%~dp0"

set "APP_DIR=%CD%"
set "LOG_FILE=%APP_DIR%\logs\update.log"
set "BACKUP_DIR=%APP_DIR%\backups"
set "DB_NAME=pos_system"
set "DB_USER=root"
set "DB_PASS="

REM Ensure log directory exists
if not exist "%APP_DIR%\logs" mkdir "%APP_DIR%\logs"

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

>> "%LOG_FILE%" echo.
>> "%LOG_FILE%" echo ========================================
>> "%LOG_FILE%" echo POS System Safe Update - %date% %time%
>> "%LOG_FILE%" echo ========================================

cls
echo.
echo  ===========================================
echo  POS System - Safe Update
echo  ===========================================
echo.
echo  This will update POS System while keeping your data.
echo  A database backup will be created first.
echo.
echo  Press any key to continue...
pause >nul

REM Check MySQL
echo.
echo [1/7] Checking MySQL status...
call scripts\check-mysql.bat >tmp_mysql.txt
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: MySQL is not running.
    echo  Please start XAMPP MySQL first.
    type tmp_mysql.txt
    >> "%LOG_FILE%" echo ERROR: MySQL not running
    del tmp_mysql.txt >nul 2>&1
    pause
    exit /b 1
)
set /p MYSQL_BIN=<tmp_mysql.txt
del tmp_mysql.txt >nul 2>&1
>> "%LOG_FILE%" echo MySQL found: %MYSQL_BIN%
echo  OK - MySQL found.

REM Check custom password file
if exist "%APP_DIR%\mysql-password.txt" (
    set /p DB_PASS=<"%APP_DIR%\mysql-password.txt"
    echo  Using password from mysql-password.txt
    >> "%LOG_FILE%" echo Using custom password file
)

REM Backup database
echo.
echo [2/7] Backing up database before update...
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
call scripts\backup-db.bat "%MYSQL_BIN%" "%DB_NAME%" "%DB_USER%" "%DB_PASS%" "%BACKUP_DIR%" >tmp_backup.txt
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: Database backup failed. Update cancelled to protect your data.
    type tmp_backup.txt
    >> "%LOG_FILE%" echo ERROR: Backup failed
    del tmp_backup.txt >nul 2>&1
    pause
    exit /b 1
)
set /p DUMP_FILE=<tmp_backup.txt
del tmp_backup.txt >nul 2>&1
echo  Backup saved: %DUMP_FILE%
>> "%LOG_FILE%" echo Backup saved: %DUMP_FILE%

REM Decide update method: git pull or ZIP
echo.
echo [3/7] Checking update source...
if exist "%APP_DIR%\.git" (
    echo  Git repository found. Using git pull...
    >> "%LOG_FILE%" echo Using git pull
    goto GIT_UPDATE
) else (
    echo  No git repository found. Looking for update ZIP...
    >> "%LOG_FILE%" echo No git repo, looking for ZIP
    goto ZIP_UPDATE
)

:GIT_UPDATE
echo.
echo [4/7] Pulling latest code from GitHub...
git config --global --add safe.directory "%APP_DIR%" >nul 2>&1

git status --short >tmp_status.txt
for %%I in (tmp_status.txt) do set /a SIZE=%%~zI
if %SIZE% gtr 0 (
    echo  Local changes detected. Stashing before pull...
    git stash push -m "auto-update-stash-%date%-%time%" >> "%LOG_FILE%" 2>&1
    if %errorlevel% neq 0 (
        echo  ERROR: Failed to stash local changes.
        >> "%LOG_FILE%" echo ERROR: Stash failed
        del tmp_status.txt >nul 2>&1
        pause
        exit /b 1
    )
)
del tmp_status.txt >nul 2>&1

git pull origin master >> "%LOG_FILE%" 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: git pull failed. Check internet / GitHub access.
    >> "%LOG_FILE%" echo ERROR: git pull failed
    pause
    exit /b 1
)
echo  OK - Code updated.
goto FINISH_UPDATE

:ZIP_UPDATE
echo.
echo [4/7] Looking for update ZIP file...
set "UPDATE_ZIP="
for %%a in ("%APP_DIR%\pos-system-*.zip") do (
    if "!UPDATE_ZIP!"=="" set "UPDATE_ZIP=%%a"
)

if "%UPDATE_ZIP%"=="" (
    echo.
    echo  No update ZIP found.
    echo  Please download the latest pos-system-vX.X.X.zip from Google Drive
    echo  and place it in this folder: %APP_DIR%
    echo.
    echo  Then run update-pos.bat again.
    >> "%LOG_FILE%" echo ERROR: No update ZIP found
    pause
    exit /b 1
)

echo  Found update ZIP: %UPDATE_ZIP%
>> "%LOG_FILE%" echo Found ZIP: %UPDATE_ZIP%

call scripts\apply-zip-update.bat "%UPDATE_ZIP%"
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: ZIP update failed.
    >> "%LOG_FILE%" echo ERROR: ZIP update failed
    pause
    exit /b 1
)
goto END

:FINISH_UPDATE
echo.
echo [5/7] Installing dependencies...
npm install >> "%LOG_FILE%" 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: npm install failed.
    >> "%LOG_FILE%" echo ERROR: npm install failed
    pause
    exit /b 1
)
echo  OK - Dependencies updated.

echo.
echo [6/7] Generating Prisma client...
npx.cmd prisma generate >> "%LOG_FILE%" 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: prisma generate failed.
    >> "%LOG_FILE%" echo ERROR: prisma generate failed
    pause
    exit /b 1
)
echo  OK - Prisma client generated.

echo.
echo [7/7] Updating database schema and building (no data loss)...
npx.cmd prisma migrate deploy >> "%LOG_FILE%" 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: prisma migrate deploy failed.
    echo  Your data is still safe because the backup was created first.
    >> "%LOG_FILE%" echo ERROR: migrate deploy failed
    pause
    exit /b 1
)
echo  OK - Database schema updated.

npm run build >> "%LOG_FILE%" 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: npm run build failed.
    >> "%LOG_FILE%" echo ERROR: build failed
    pause
    exit /b 1
)
echo  OK - Build completed.

REM Restart POS
echo.
echo  Restarting POS System...
>> "%LOG_FILE%" echo Restarting POS System
wmic process where "name='node.exe' AND CommandLine LIKE '%%%APP_DIR%%%'" delete >nul 2>&1
timeout /t 3 /nobreak >nul
start "" "%APP_DIR%\scripts\start-pos.bat"

echo.
echo  ===========================================
echo  Update completed successfully!
echo  ===========================================
echo.
echo  Your data is safe. Backup saved at:
echo    %DUMP_FILE%
echo.
echo  Log file: %LOG_FILE%
echo.
echo  Opening POS System in browser...
start "" "http://localhost:3000"

:END
pause
exit /b 0
