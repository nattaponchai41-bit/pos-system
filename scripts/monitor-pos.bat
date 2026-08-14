@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

REM POS System monitor - runs as scheduled task every 2 minutes
set "APP_DIR=%~1"
if "%APP_DIR%"=="" set "APP_DIR=%~dp0.."

REM Check if POS is responding on port 3000
powershell -Command "try { (New-Object Net.Sockets.TcpClient).Connect('localhost', 3000); exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% neq 0 (
    echo %date% %time% POS not responding. Restarting... >> "%APP_DIR%\logs\monitor.log"
    call "%APP_DIR%\scripts\restart-pos.bat" "%APP_DIR%"
)

exit /b 0
