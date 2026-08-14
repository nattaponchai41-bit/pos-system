@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

REM =====================================================
REM POS System Installer Post-Install Script
REM Arguments: %1 = APP_DIR, %2 = AUTO_START (true/false)
REM =====================================================

set "APP_DIR=%~1"
set "AUTO_START=%~2"
set "DB_NAME=pos_system"
set "DB_USER=root"
set "DB_PASS="
set "NEXTAUTH_URL=http://localhost:3000"

if "%APP_DIR%"=="" (
    echo ERROR: APP_DIR not provided
    exit /b 1
)

cd /d "%APP_DIR%"

REM =====================================================
REM 1. Check Node.js
REM =====================================================
echo [Installer] Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found
    exit /b 1
)
echo OK - Node.js found.

REM =====================================================
REM 2. Check MySQL
REM =====================================================
echo [Installer] Checking MySQL/MariaDB...
call scripts\check-mysql.bat >"%APP_DIR%\logs\mysql-check.log" 2>&1
set /p MYSQL_STATUS=<"%APP_DIR%\logs\mysql-check.log"

if "%MYSQL_STATUS%"=="MYSQL_NOT_FOUND" (
    echo ERROR: MySQL/MariaDB not found. Please install XAMPP and start MySQL.
    exit /b 1
)
if "%MYSQL_STATUS%"=="MYSQL_NOT_RUNNING" (
    echo ERROR: MySQL/MariaDB is not running. Please start MySQL service.
    exit /b 1
)

echo OK - MySQL found at %MYSQL_STATUS%.
set "MYSQL_BIN=%MYSQL_STATUS%"

REM =====================================================
REM 3. Ask for root password if needed (silent mode: empty)
REM =====================================================
echo [Installer] Database configuration...
REM For silent/unattended install we use empty password by default
REM If mysql connection fails with empty password, we need user input
REM But Inno Setup should have already verified. We'll create .env with empty first.

REM Test connection with empty password
"%MYSQL_BIN%" --host=localhost --port=3306 --user=%DB_USER% -e "SELECT 1;" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Could not connect to MySQL with empty root password.
    echo Please create a temporary text file at %APP_DIR%\mysql-password.txt with the root password and re-run.
    exit /b 1
)

REM =====================================================
REM 4. Create database
REM =====================================================
echo [Installer] Creating database %DB_NAME% if not exists...
call scripts\create-db.bat "%MYSQL_BIN%" "%DB_NAME%" "%DB_USER%" "%DB_PASS%" >nul 2>"%APP_DIR%\logs\create-db.log"
if %errorlevel% neq 0 (
    echo ERROR: Failed to create database. See logs\create-db.log
    exit /b 1
)
echo OK.

REM =====================================================
REM 5. Backup existing .env if exists (update scenario)
REM =====================================================
echo [Installer] Checking .env file...
if exist "%APP_DIR%\.env" (
    echo Backing up existing .env...
    copy /Y "%APP_DIR%\.env" "%APP_DIR%\.env.bak" >nul
) else (
    echo Creating .env from .env.example...
    REM Generate random NEXTAUTH_SECRET (32 hex chars)
    for /f "tokens=*" %%a in ('node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"') do set "NEXTAUTH_SECRET=%%a"
    (
        echo DATABASE_URL="mysql://%DB_USER%:@localhost:3306/%DB_NAME%"
        echo NEXTAUTH_URL="%NEXTAUTH_URL%"
        echo NEXTAUTH_SECRET="%NEXTAUTH_SECRET%"
    ) > "%APP_DIR%\.env"
)
echo OK.

REM =====================================================
REM 6. Backup database before update (if database has tables)
REM =====================================================
echo [Installer] Checking if database has existing data...
call scripts\check-db-empty.bat "%MYSQL_BIN%" "%DB_NAME%" "%DB_USER%" "%DB_PASS%" >"%APP_DIR%\logs\db-table-count.log" 2>&1
set /p TABLE_COUNT=<"%APP_DIR%\logs\db-table-count.log"

if "%TABLE_COUNT%"=="" set "TABLE_COUNT=0"
if %TABLE_COUNT% gtr 0 (
    echo Database has %TABLE_COUNT% tables. Creating backup before update...
    call scripts\backup-db.bat "%MYSQL_BIN%" "%DB_NAME%" "%DB_USER%" "%DB_PASS%" "%APP_DIR%\backups" >"%APP_DIR%\logs\backup-path.log" 2>"%APP_DIR%\logs\backup-error.log"
    if %errorlevel% neq 0 (
        echo WARNING: Database backup failed. Continuing installation...
    ) else (
        set /p BACKUP_PATH=<"%APP_DIR%\logs\backup-path.log"
        echo Backup created at: %BACKUP_PATH%
    )
    set "SHOULD_SEED=false"
) else (
    echo Database is empty. Will seed default data.
    set "SHOULD_SEED=true"
)

REM =====================================================
REM 7. Install dependencies
REM =====================================================
echo [Installer] Installing npm dependencies...
npm install >"%APP_DIR%\logs\npm-install.log" 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm install failed. See logs\npm-install.log
    exit /b 1
)
echo OK.

REM =====================================================
REM 8. Generate Prisma Client
REM =====================================================
echo [Installer] Generating Prisma Client...
npx.cmd prisma generate >"%APP_DIR%\logs\prisma-generate.log" 2>&1
if %errorlevel% neq 0 (
    echo ERROR: prisma generate failed. See logs\prisma-generate.log
    exit /b 1
)
echo OK.

REM =====================================================
REM 9. Deploy migrations (safe)
REM =====================================================
echo [Installer] Deploying database migrations (safe, no data loss)...
npx.cmd prisma migrate deploy >"%APP_DIR%\logs\prisma-migrate.log" 2>&1
if %errorlevel% neq 0 (
    echo ERROR: prisma migrate deploy failed. See logs\prisma-migrate.log
    exit /b 1
)
echo OK.

REM =====================================================
REM 10. Seed only if database was empty
REM =====================================================
if "%SHOULD_SEED%"=="true" (
    echo [Installer] Seeding default data...
    npm run db:seed >"%APP_DIR%\logs\db-seed.log" 2>&1
    if %errorlevel% neq 0 (
        echo ERROR: db:seed failed. See logs\db-seed.log
        exit /b 1
    )
    echo OK.
) else (
    echo [Installer] Database already has data. Skipping seed to protect existing data.
)

REM =====================================================
REM 11. Production build
REM =====================================================
echo [Installer] Building production application...
npm run build >"%APP_DIR%\logs\npm-build.log" 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm run build failed. See logs\npm-build.log
    exit /b 1
)
echo OK.

REM =====================================================
REM 12. Install auto-start task
REM =====================================================
echo [Installer] Configuring auto-start...
call scripts\install-service.bat "%APP_DIR%" "%AUTO_START%" >"%APP_DIR%\logs\service-install.log" 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Could not configure auto-start. See logs\service-install.log
) else (
    echo OK.
)

REM =====================================================
REM 13. Start POS now
REM =====================================================
echo [Installer] Starting POS System...
start "" /min "%APP_DIR%\scripts\start-pos.bat"

echo.
echo ===========================================
echo POS System installation completed.
echo ===========================================
echo.
echo Default login:
echo   Admin:   admin@pos.local / admin123
echo   Cashier: cashier@pos.local / cashier123
echo   Stock:   stock@pos.local / stock123
echo.
echo Open browser: http://localhost:3000
echo.

exit /b 0
