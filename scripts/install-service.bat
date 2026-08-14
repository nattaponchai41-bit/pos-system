@echo off
chcp 65001 >nul
setlocal

set "APP_DIR=%~1"
set "AUTO_START=%~2"

if "%APP_DIR%"=="" (
    echo APP_DIR required
    exit /b 1
)

REM Remove old task if exists
schtasks /Delete /TN "POS-System-Start" /F >nul 2>&1

if /I "%AUTO_START%"=="true" (
    schtasks /Create /TN "POS-System-Start" /TR "\"%APP_DIR%\scripts\start-pos.bat\"" /SC ONSTART /RU SYSTEM /RL HIGHEST /F >nul 2>&1
    if %errorlevel% neq 0 (
        echo SCHEDULE_FAILED
        exit /b 1
    )
    echo SCHEDULED
) else (
    echo MANUAL
)

exit /b 0
