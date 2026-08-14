#Requires -Version 5.1
[CmdletBinding()]
param(
    [string]$BackupDir = "..\backups",
    [int]$KeepDays = 30,
    [string]$ExtraCopyDir = "",
    [string]$EnvFile = "..\.env"
)

$ErrorActionPreference = 'Stop'

function Find-MySqlDump {
    $candidates = @(
        "${env:ProgramFiles}\MariaDB*\bin\mysqldump.exe"
        "${env:ProgramFiles(x86)}\MariaDB*\bin\mysqldump.exe"
        "C:\xampp\mysql\bin\mysqldump.exe"
        "C:\wamp64\bin\mysql\mysql*\bin\mysqldump.exe"
        "mysqldump.exe"
    )
    foreach ($pattern in $candidates) {
        $found = Get-Item $pattern -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) { return $found.FullName }
    }
    throw "ไม่พบ mysqldump.exe กรุณาติดตั้ง MariaDB client หรือ XAMPP และเพิ่ม path ใน PATH"
}

function Get-DatabaseUrl {
    param([string]$Path)
    if (-not (Test-Path $Path)) {
        throw "ไม่พบไฟล์ .env ที่ $Path"
    }
    $raw = Get-Content $Path -Raw
    $line = ($raw -split "`r?`n") | Where-Object { $_ -match '^DATABASE_URL\s*=' } | Select-Object -First 1
    if (-not $line) {
        throw "ไม่พบ DATABASE_URL ใน .env"
    }
    $value = $line -replace '^DATABASE_URL\s*=\s*', ''
    $value = $value -replace '^["\''']|["\''']$', ''
    return $value
}

function Parse-ConnectionString {
    param([string]$Url)
    $re = '^mysql://(?<user>[^:@]+)(:(?<pass>[^@]*))?@(?<host>[^:/]+)(:(?<port>\d+))?/(?<db>[^?]+)'
    $m = [regex]::Match($Url, $re)
    if (-not $m.Success) {
        throw "รูปแบบ DATABASE_URL ไม่ถูกต้อง"
    }
    return [PSCustomObject]@{
        User = $m.Groups['user'].Value
        Pass = $m.Groups['pass'].Value
        Host = $m.Groups['host'].Value
        Port = if ($m.Groups['port'].Success) { $m.Groups['port'].Value } else { '3306' }
        Db   = $m.Groups['db'].Value
    }
}

function Invoke-Backup {
    param(
        [string]$DumpTool,
        [PSCustomObject]$Conn,
        [string]$OutFile
    )
    $args = @(
        "-u", $Conn.User,
        "-h", $Conn.Host,
        "-P", $Conn.Port,
        "--routines",
        "--triggers",
        "--single-transaction",
        "--extended-insert",
        "--result-file", $OutFile,
        $Conn.Db
    )
    if ($Conn.Pass) {
        $args = @("--password=$($Conn.Pass)") + $args
    }
    & $DumpTool @args
    if ($LASTEXITCODE -ne 0) {
        throw "mysqldump ล้มเหลว (exit code $LASTEXITCODE)"
    }
}

# Main
Write-Host "=== POS Database Backup ==="

$dumpTool = Find-MySqlDump
Write-Host "ใช้งาน: $dumpTool"

$dbUrl = Get-DatabaseUrl -Path $EnvFile
Write-Host "อ่าน DATABASE_URL จาก $EnvFile"

$conn = Parse-ConnectionString -Url $dbUrl
Write-Host "ฐานข้อมูล: $($conn.Db) @ $($conn.Host):$($conn.Port)"

$rootBackup = Resolve-Path (Join-Path $PSScriptRoot $BackupDir) -ErrorAction SilentlyContinue
if (-not $rootBackup) {
    $rootBackup = Join-Path $PSScriptRoot $BackupDir
}
New-Item -ItemType Directory -Path $rootBackup -Force | Out-Null

$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$sqlFile = Join-Path $rootBackup "pos_system_$timestamp.sql"
$zipFile = Join-Path $rootBackup "pos_system_$timestamp.zip"

Write-Host "กำลังสำรองข้อมูลไปที่ $sqlFile ..."
Invoke-Backup -DumpTool $dumpTool -Conn $conn -OutFile $sqlFile

Write-Host "บีบอัดไฟล์เป็น $zipFile ..."
Compress-Archive -Path $sqlFile -DestinationPath $zipFile -CompressionLevel Optimal
Remove-Item $sqlFile

if ($ExtraCopyDir) {
    if (-not (Test-Path $ExtraCopyDir)) {
        New-Item -ItemType Directory -Path $ExtraCopyDir -Force | Out-Null
    }
    Copy-Item $zipFile -Destination $ExtraCopyDir -Force
    Write-Host "คัดลอกสำเนาไปที่ $ExtraCopyDir"
}

$cutoff = (Get-Date).AddDays(-$KeepDays)
Get-ChildItem $rootBackup -File |
    Where-Object { $_.CreationTime -lt $cutoff } |
    ForEach-Object {
        Write-Host "ลบแบ็กอัปเก่า: $($_.Name)"
        Remove-Item $_.FullName -Force
    }

Write-Host "แบ็กอัปเสร็จสิ้น: $zipFile"
