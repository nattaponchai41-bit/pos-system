@echo off
chcp 65001 >nul
setlocal

set "MYSQL_BIN=%~1"
set "DB_NAME=%~2"
set "DB_USER=%~3"
set "DB_PASS=%~4"

REM Count tables in database
if "%DB_PASS%"=="" (
    for /f "tokens=*" %%a in ('"%MYSQL_BIN%" --host=localhost --port=3306 --user=%DB_USER% -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = ''%DB_NAME%'';" --batch --skip-column-names 2^>nul') do set "TABLE_COUNT=%%a"
) else (
    for /f "tokens=*" %%a in ('"%MYSQL_BIN%" --host=localhost --port=3306 --user=%DB_USER% --password=%DB_PASS% -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = ''%DB_NAME%'';" --batch --skip-column-names 2^>nul') do set "TABLE_COUNT=%%a"
)

REM If no tables or count is empty, treat as empty
if "%TABLE_COUNT%"=="" (
    echo EMPTY
    exit /b 0
)
echo %TABLE_COUNT%
exit /b 0
