# POS System - Installer User Guide

## Installation

1. Make sure Node.js LTS and XAMPP (MySQL) are installed, or run the bundled installer if provided.
2. Double-click `POS-System-Setup.exe`.
3. Follow the wizard:
   - Choose install location (default: `C:\POS-System`)
   - Select shortcuts and auto-start options
4. Installer will:
   - Check Node.js and MySQL
   - Create database `pos_system`
   - Generate `.env` with random secret
   - Install dependencies
   - Run Prisma migrations
   - Seed default data only on first install
   - Build production app
   - Start POS System
5. Open browser at http://localhost:3000

## Default Login

| Email | Password | Role |
|---|---|---|
| admin@pos.local | admin123 | Admin |
| cashier@pos.local | cashier123 | Cashier |
| stock@pos.local | stock123 | Stock |

**Change passwords immediately after first login.**

## Daily Use

- POS auto-starts with Windows if you selected that option.
- If not auto-starting, double-click `C:\POS-System\scripts\start-pos.bat`.
- Open http://localhost:3000 in your browser.

## Update

To update to a new version:

1. Run the new `POS-System-Setup.exe`.
2. It will:
   - Backup database to `C:\POS-System\backups\`
   - Preserve `.env`
   - Apply new migrations
   - Build new version
   - Restart POS

Your sales data, products, customers, and settings will be preserved.

## Backup Database

Double-click `C:\POS-System\scripts\backup-db.bat` or use the Start Menu shortcut.

Backups are saved to:
```
C:\POS-System\backups\
```

## Restore Database

1. Close POS System.
2. Open Command Prompt as Administrator.
3. Run:
```cmd
cd C:\POS-System
scripts\restore-db.bat "C:\xampp\mysql\bin\mysql.exe" pos_system root "" "C:\POS-System\backups\pos_system_YYYY-MM-DD_HHMM.sql"
```
Replace path and password as needed.

## Uninstall

1. Go to Windows Settings → Apps → POS System → Uninstall.
2. The uninstaller will ask if you want to keep the database.
3. **Recommended: Choose Yes to keep all sales data.**
4. If you choose No, uploaded files in `uploads\` will be deleted. Database deletion is not performed automatically by the uninstaller to protect data.

## Troubleshooting

### "Node.js not found"
Install Node.js LTS from https://nodejs.org/ then re-run installer.

### "MySQL not running"
Open XAMPP Control Panel and click **Start** next to MySQL.

### "Port 3000 already in use"
Stop another application using port 3000, or edit `start-pos.bat` to use a different port.

### POS not starting after reboot
1. Check that MySQL is running.
2. Open Task Scheduler and verify task `POS-System-Start` exists.
3. Check `C:\POS-System\logs\` for error logs.

## Support

For manual setup or advanced configuration, see `INSTALL.md` in the project folder.
