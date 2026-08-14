@echo off
chcp 65001 >nul
title POS System - Dev Mode
cd /d "%~dp0"
npm run dev
pause
