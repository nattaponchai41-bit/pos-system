@echo off
chcp 65001 >nul
title POS System - Create Release ZIP
setlocal EnableDelayedExpansion

cd /d "%~dp0.."
set "PROJECT_DIR=%CD%"
set "RELEASE_DIR=%PROJECT_DIR%\releases"
set "VERSION=0.1.0"
set "ZIP_NAME=pos-system-v%VERSION%.zip"
set "ZIP_PATH=%RELEASE_DIR%\%ZIP_NAME%"

if not exist "%RELEASE_DIR%" mkdir "%RELEASE_DIR%"

cls
echo.
echo  ===========================================
echo  POS System - Create Release ZIP
echo  ===========================================
echo.
echo  Version: %VERSION%
echo  Output:  %ZIP_PATH%
echo.

REM Build production first
echo [1/3] Building production...
npm run build >"%PROJECT_DIR%\logs\release-build.log" 2>&1
if %errorlevel% neq 0 (
    if not exist "%PROJECT_DIR%\logs" mkdir "%PROJECT_DIR%\logs"
    echo  ERROR: Build failed. See logs\release-build.log
    pause
    exit /b 1
)
echo  OK - Build completed.

REM Create clean zip using PowerShell (no 7-Zip required)
echo [2/3] Creating ZIP file with PowerShell...
if exist "%ZIP_PATH%" del "%ZIP_PATH%"

REM Use PowerShell Compress-Archive, excluding unwanted folders
powershell -NoProfile -ExecutionPolicy Bypass -Command "
$ErrorActionPreference = 'Stop';
$source = '%PROJECT_DIR%';
$dest = '%ZIP_PATH%';
$excludes = @('node_modules', '.next', '.git', '.claude', '.agents', '.windsurf', 'backups', 'logs', 'releases', 'test-*.pdf', 'POS-System-Setup.exe', 'xampp-installer.exe', 'cookies.txt', 'skills-lock.json', '*.log');
$items = Get-ChildItem -Path $source -Force | Where-Object {
    $name = $_.Name;
    $exclude = $false;
    foreach ($pattern in $excludes) {
        if ($name -like $pattern) { $exclude = $true; break; }
    }
    -not $exclude
};
Compress-Archive -Path ($items | Select-Object -ExpandProperty FullName) -DestinationPath $dest -Force;
"

if %errorlevel% neq 0 (
    echo  ERROR: Failed to create ZIP with PowerShell.
    pause
    exit /b 1
)
echo  OK - ZIP created.

REM Show result
echo [3/3] Done.
for %%I in ("%ZIP_PATH%") do echo  Size: %%~zI bytes
echo.
echo  ===========================================
echo  Release ZIP created successfully!
echo  ===========================================
echo.
echo  File: %ZIP_PATH%
echo.
echo  Upload this ZIP to Google Drive and share with customers.
echo.
pause
exit /b 0
