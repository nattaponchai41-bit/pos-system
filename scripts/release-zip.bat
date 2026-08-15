@echo off
chcp 65001 >nul
title POS System - Create Release ZIP
setlocal EnableDelayedExpansion

cd /d "%~dp0.."
set "PROJECT_DIR=%CD%"
set "RELEASE_DIR=%PROJECT_DIR%\releases"
for /f "tokens=*" %%a in ('node -e "console.log(require('./package.json').version)"') do set "VERSION=%%a"
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

REM Check if 7zip exists
set "ZIP_TOOL="
if exist "C:\Program Files\7-Zip\7z.exe" set "ZIP_TOOL=C:\Program Files\7-Zip\7z.exe"
if exist "C:\Program Files (x86)\7-Zip\7z.exe" set "ZIP_TOOL=C:\Program Files (x86)\7-Zip\7z.exe"

if "%ZIP_TOOL%"=="" (
    echo  ERROR: 7-Zip not found.
    echo  Please install 7-Zip from https://www.7-zip.org/
    pause
    exit /b 1
)

REM Build production first
echo [1/3] Building production...
npm run build >"%PROJECT_DIR%\logs\release-build.log" 2>&1
if %errorlevel% neq 0 (
    echo  ERROR: Build failed. See logs\release-build.log
    pause
    exit /b 1
)
echo  OK - Build completed.

REM Create clean zip excluding dev artifacts
echo [2/3] Creating ZIP file...
if exist "%ZIP_PATH%" del "%ZIP_PATH%"

"%ZIP_TOOL%" a -r -tzip -xr!node_modules -xr!.next -xr!.git -xr!.claude -xr!.agents -xr!.windsurf -xr!backups -xr!logs -xr!releases -xr!test-*.pdf -xr!POS-System-Setup.exe -xr!xampp-installer.exe -xr!cookies.txt -xr!skills-lock.json -xr!*.log "%ZIP_PATH%" "%PROJECT_DIR%\*"

if %errorlevel% neq 0 (
    echo  ERROR: Failed to create ZIP.
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
