@echo off
chcp 65001 > nul
echo POS System - Database Backup
echo ==============================

cd /d "%~dp0"

powershell -ExecutionPolicy Bypass -File backup-db.ps1 -BackupDir "..\backups" -KeepDays 30

pause
