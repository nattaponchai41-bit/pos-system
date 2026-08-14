@echo off
chcp 65001 >nul
setlocal

set "APP_DIR=%~1"
if "%APP_DIR%"=="" set "APP_DIR=%~dp0.."

REM Kill existing node.exe running POS from APP_DIR
wmic process where "name='node.exe' AND CommandLine LIKE '%%%APP_DIR%%%'" delete >nul 2>&1
timeout /t 2 /nobreak >nul

REM Restart
start "" /min "%APP_DIR%\scripts\start-pos.bat"
exit /b 0
