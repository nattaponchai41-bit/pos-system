@echo off
chcp 65001 >nul
setlocal

set "MYSQL_BIN=%~1"
set "DB_NAME=%~2"
set "DB_USER=%~3"
set "DB_PASS=%~4"
set "DUMP_FILE=%~5"

if not exist "%DUMP_FILE%" (
    echo FILE_NOT_FOUND
    exit /b 1
)

if "%DB_PASS%"=="" (
    "%MYSQL_BIN%" --host=localhost --port=3306 --user=%DB_USER% %DB_NAME% < "%DUMP_FILE%" >nul 2>&1
) else (
    "%MYSQL_BIN%" --host=localhost --port=3306 --user=%DB_USER% --password=%DB_PASS% %DB_NAME% < "%DUMP_FILE%" >nul 2>&1
)

exit /b %errorlevel%
