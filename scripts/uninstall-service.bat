@echo off
chcp 65001 >nul
setlocal

REM Remove scheduled task
schtasks /Delete /TN "POS-System-Start" /F >nul 2>&1

REM Stop any running node process from POS directory
set "APP_DIR=%~1"
if not "%APP_DIR%"=="" (
    wmic process where "name='node.exe' AND CommandLine LIKE '%%%APP_DIR%%%'" delete >nul 2>&1
)

echo OK
exit /b 0
