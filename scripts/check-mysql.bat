@echo off
chcp 65001 >nul
setlocal

REM Find mysql.exe
set "MYSQL_BIN="
if exist "C:\xampp\mysql\bin\mysql.exe" set "MYSQL_BIN=C:\xampp\mysql\bin\mysql.exe"
if "%MYSQL_BIN%"=="" (
    for /f "delims=" %%a in ('dir /B /S "C:\xampp\mysql\bin\mysql.exe" 2^>nul') do set "MYSQL_BIN=%%a"
)
if "%MYSQL_BIN%"=="" (
    for /f "delims=" %%a in ('dir /B /S "C:\Program Files\MariaDB *\bin\mysql.exe" 2^>nul') do set "MYSQL_BIN=%%a"
)
if "%MYSQL_BIN%"=="" (
    for /f "delims=" %%a in ('dir /B /S "C:\Program Files\MySQL\MySQL Server *\bin\mysql.exe" 2^>nul') do set "MYSQL_BIN=%%a"
)

if "%MYSQL_BIN%"=="" (
    echo MYSQL_NOT_FOUND
    exit /b 1
)

"%MYSQL_BIN%" --host=localhost --port=3306 --user=root -e "SELECT 1;" >nul 2>&1
if %errorlevel% neq 0 (
    echo MYSQL_NOT_RUNNING
    exit /b 2
)

echo %MYSQL_BIN%
exit /b 0
