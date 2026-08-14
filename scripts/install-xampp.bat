@echo off
chcp 65001 >nul
title POS System - Installing XAMPP
setlocal

set "XAMPP_INSTALLER=%~1"
set "XAMPP_DIR=C:\xampp"

if "%XAMPP_INSTALLER%"=="" (
    echo ERROR: XAMPP installer path required.
    exit /b 1
)

if exist "%XAMPP_DIR%\mysql\bin\mysql.exe" (
    echo XAMPP already installed.
    exit /b 0
)

echo Installing XAMPP silently. This may take a few minutes...
"%XAMPP_INSTALLER%" --mode unattended --unattendedmodeui none --launchapps 0 --disable-components xampp_apache,xampp_php,xampp_perl,xampp_tomcat,xampp_filezilla,xampp_mercury,xampp_webalizer

if %errorlevel% neq 0 (
    echo ERROR: XAMPP installation failed.
    exit /b 1
)

echo XAMPP installed successfully.
exit /b 0
