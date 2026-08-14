@echo off
chcp 65001 >nul
title POS System - Update
cd /d "%~dp0"
echo Updating dependencies...
npm install
echo Updating database schema (no data loss)...
npx.cmd prisma migrate deploy
echo Building production...
npm run build
echo.
echo Update complete. Run start.bat to start.
pause
