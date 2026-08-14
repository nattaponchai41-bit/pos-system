@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

set "MYSQL_BIN=%~1"
set "DB_NAME=%~2"
set "DB_USER=%~3"
set "DB_PASS=%~4"
set "BACKUP_DIR=%~5"

REM Create backup directory
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Generate timestamp
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c-%%a-%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
set "TIMESTAMP=%mydate%_%mytime%"
set "SAFE_TS=%TIMESTAMP::=%"
set "SAFE_TS=%SAFE_TS:/=%"
set "SAFE_TS=%SAFE_TS: =_%"

set "DUMP_FILE=%BACKUP_DIR%\%DB_NAME%_%SAFE_TS%.sql"

if "%DB_PASS%"=="" (
    "%MYSQL_BIN%/../mysqldump.exe" --host=localhost --port=3306 --user=%DB_USER% --single-transaction --routines --triggers %DB_NAME% > "%DUMP_FILE%" 2>"%BACKUP_DIR%\dump_error.log"
) else (
    "%MYSQL_BIN%/../mysqldump.exe" --host=localhost --port=3306 --user=%DB_USER% --password=%DB_PASS% --single-transaction --routines --triggers %DB_NAME% > "%DUMP_FILE%" 2>"%BACKUP_DIR%\dump_error.log"
)

if %errorlevel% neq 0 (
    echo BACKUP_FAILED
    exit /b 1
)

echo %DUMP_FILE%
exit /b 0
