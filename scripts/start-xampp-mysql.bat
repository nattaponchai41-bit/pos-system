@echo off
chcp 65001 >nul
setlocal

set "XAMPP_DIR=C:\xampp"

if not exist "%XAMPP_DIR%\mysql\bin\mysqld.exe" (
    echo MYSQL_NOT_FOUND
    exit /b 1
)

REM Check if MySQL already running
"%XAMPP_DIR%\mysql\bin\mysql.exe" --host=localhost --port=3306 --user=root -e "SELECT 1;" >nul 2>&1
if %errorlevel% == 0 (
    echo MYSQL_ALREADY_RUNNING
    exit /b 0
)

REM Start MySQL service if exists
if exist "%XAMPP_DIR%\mysql\bin\mysqld.exe" (
    net start mysql >nul 2>&1
    if %errorlevel% == 0 (
        timeout /t 3 /nobreak >nul
        echo MYSQL_SERVICE_STARTED
        exit /b 0
    )
)

REM Start MySQL via xampp-control
if exist "%XAMPP_DIR%\xampp-control.exe" (
    start "" /min "%XAMPP_DIR%\xampp-control.exe"
    timeout /t 5 /nobreak >nul
)

REM Fallback: start mysqld directly
start "" /min "%XAMPP_DIR%\mysql\bin\mysqld.exe" --defaults-file="%XAMPP_DIR%\mysql\bin\my.ini"
timeout /t 5 /nobreak >nul

REM Verify
"%XAMPP_DIR%\mysql\bin\mysql.exe" --host=localhost --port=3306 --user=root -e "SELECT 1;" >nul 2>&1
if %errorlevel% neq 0 (
    echo MYSQL_START_FAILED
    exit /b 1
)

echo MYSQL_STARTED
exit /b 0
