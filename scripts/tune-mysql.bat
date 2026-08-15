@echo off
setlocal EnableDelayedExpansion

set "MYSQL_BIN=%~1"
if "%MYSQL_BIN%"=="" (
    echo ERROR: MySQL binary path not provided.
    exit /b 1
)

set "MY_INI="
if exist "C:\xampp\mysql\bin\my.ini" set "MY_INI=C:\xampp\mysql\bin\my.ini"
if "%MY_INI%"=="" if exist "C:\xampp\mysql\my.ini" set "MY_INN=C:\xampp\mysql\my.ini"
if "%MY_INI%"=="" if exist "C:\Program Files\xampp\mysql\bin\my.ini" set "MY_INI=C:\Program Files\xampp\mysql\bin\my.ini"
if "%MY_INI%"=="" if exist "C:\xampp\mysql\bin\my.cnf" set "MY_INI=C:\xampp\mysql\bin\my.cnf"

if "%MY_INI%"=="" (
    echo WARNING: Could not find my.ini. Skipping file tuning.
    goto RESTART_MYSQL
)

echo Found my.ini at %MY_INI%

findstr /B /I "max_connections" "%MY_INI%" >nul 2>&1
if %errorlevel% neq 0 (
    echo Adding max_connections=500 to %MY_INI%
    echo. >> "%MY_INI%"
    echo [mysqld] >> "%MY_INI%"
    echo max_connections=500 >> "%MY_INI%"
) else (
    echo max_connections already configured in %MY_INI%
)

:RESTART_MYSQL
echo Restarting MySQL to apply max_connections...
taskkill /F /IM mysqld.exe >nul 2>&1
timeout /t 3 /nobreak >nul

if exist "C:\xampp\xampp-control.exe" (
    start "" "C:\xampp\xampp-control.exe"
)

if exist "C:\xampp\mysql\bin\mysqld.exe" (
    start /min "" "C:\xampp\mysql\bin\mysqld.exe" --defaults-file="C:\xampp\mysql\bin\my.ini"
)

timeout /t 5 /nobreak >nul

"%MYSQL_BIN%" -u root -e "SHOW VARIABLES LIKE 'max_connections';" >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Could not verify max_connections after restart.
) else (
    echo OK - MySQL restarted.
)

exit /b 0
