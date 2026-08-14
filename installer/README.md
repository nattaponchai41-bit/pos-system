# POS System Windows Installer

## Files

- `POS-System.iss` - Inno Setup script source
- `../scripts/` - Helper batch scripts used by installer
- `../POS-System-Setup.exe` - Compiled installer (output)

## Build Installer

### Requirements

1. [Inno Setup 6](https://jrsoftware.org/isinfo.php) installed
2. Project already built: `npm install`, `npm run build`

### Build command

Open **Inno Setup Compiler** (ISCC.exe):

```powershell
cd C:\Users\%USERNAME%\Projects\pos-system\installer
& "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" POS-System.iss
```

Or from Command Prompt:

```cmd
cd C:\Users\%USERNAME%\Projects\pos-system\installer
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" POS-System.iss
```

Output: `..\POS-System-Setup.exe`

## What Installer Does

1. Copies project files to `C:\POS-System`
2. Checks Node.js and MySQL
3. Creates database `pos_system`
4. Generates `.env` with random `NEXTAUTH_SECRET`
5. Runs `npm install`
6. Runs `npx prisma generate`
7. Runs `npx prisma migrate deploy` (safe, no data loss)
8. Runs `npm run db:seed` only if database is empty
9. Runs `npm run build`
10. Creates Desktop and Start Menu shortcuts
11. Optionally sets up auto-start via Task Scheduler
12. Starts POS System

## Update Behavior

When installing over existing installation:
- Backups existing `.env` to `.env.bak`
- Backups database to `backups\` folder before migration
- Runs `migrate deploy` to apply new migrations
- Does NOT seed if database already has data
- Builds new production output
- Restarts POS

## Uninstall Behavior

Uninstall removes application files but:
- Does NOT delete database automatically
- Does NOT delete `backups/` folder automatically
- Asks user before removing data (handled by installer flags)

## Auto-Start Method

Uses Windows Task Scheduler (not Windows Service) because:
- Node.js + Next.js run better in user/network context
- Easier to debug and restart
- No NSSM/PM2 dependency required

Scheduled task: `POS-System-Start`
Runs: `scripts\start-pos.bat` at Windows startup

## Monitoring / Auto-Restart

Use `scripts\monitor-pos.bat` with another scheduled task running every 2 minutes to restart POS if port 3000 is not responding.
