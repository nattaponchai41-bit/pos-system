# POS System Auto-Start and Crash Recovery

## How Auto-Start Works

The installer uses **Windows Task Scheduler** instead of a Windows Service because:

- Node.js apps run better in normal user/network context
- No extra dependency like NSSM or PM2 needed
- Easy to debug and restart manually

Scheduled task name: `POS-System-Start`
Trigger: At system startup
Action: Run `C:\POS-System\scripts\start-pos.bat`

## start-pos.bat Behavior

1. Waits for MySQL to be ready (up to 60 seconds)
2. Changes to project directory
3. Runs `npm run start`

## Crash Recovery

For automatic restart when POS crashes, add a monitoring scheduled task:

### Step 1: Create Monitor Task

Open Command Prompt as Administrator:

```cmd
schtasks /Create /TN "POS-System-Monitor" /TR "C:\POS-System\scripts\monitor-pos.bat" /SC MINUTE /MO 2 /RU SYSTEM /RL HIGHEST /F
```

This checks every 2 minutes if port 3000 responds. If not, it restarts POS.

### Step 2: Verify

1. Start POS.
2. Open http://localhost:3000 in browser.
3. Open Task Manager, find `node.exe`, and end the process.
4. Within 2 minutes, the monitor task should restart POS.
5. Refresh browser - POS should respond again.

## Manual Control

### Start POS
```cmd
C:\POS-System\scripts\start-pos.bat
```

### Restart POS
```cmd
C:\POS-System\scripts\restart-pos.bat C:\POS-System
```

### Stop POS Auto-Start
```cmd
schtasks /Delete /TN "POS-System-Start" /F
```

## Logs

Check logs at:
```
C:\POS-System\logs\
```

Files:
- `mysql-check.log`
- `npm-install.log`
- `prisma-generate.log`
- `prisma-migrate.log`
- `db-seed.log`
- `npm-build.log`
- `service-install.log`
- `monitor.log` (if monitor task enabled)
