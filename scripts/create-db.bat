@echo off
chcp 65001 >nul
setlocal

set "MYSQL_BIN=%~1"
set "DB_NAME=%~2"
set "DB_USER=%~3"
set "DB_PASS=%~4"

if "%DB_PASS%"=="" (
    "%MYSQL_BIN%" --host=localhost --port=3306 --user=%DB_USER% -e "CREATE DATABASE IF NOT EXISTS %DB_NAME% CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" >nul 2>&1
) else (
    "%MYSQL_BIN%" --host=localhost --port=3306 --user=%DB_USER% --password=%DB_PASS% -e "CREATE DATABASE IF NOT EXISTS %DB_NAME% CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" >nul 2>&1
)

exit /b %errorlevel%
