#Requires -Version 5.1
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$BackupFile,
    [string]$EnvFile = "..\.env"
)

$ErrorActionPreference = 'Stop'

function Find-MySql {
    $candidates = @(
        "${env:ProgramFiles}\MariaDB*\bin\mysql.exe"
        "${env:ProgramFiles(x86)}\MariaDB*\bin\mysql.exe"
        "C:\xampp\mysql\bin\mysql.exe"
        "C:\wamp64\bin\mysql\mysql*\bin\mysql.exe"
        "mysql.exe"
    )
    foreach ($pattern in $candidates) {
        $found = Get-Item $pattern -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) { return $found.FullName }
    }
    throw "ไม่พบ mysql.exe"
}

function Get-DatabaseUrl {
    param([string]$Path)
    if (-not (Test-Path $Path)) { throw "ไม่พบไฟล์ .env" }
    $raw = Get-Content $Path -Raw
    $line = ($raw -split "`r?`n") | Where-Object { $_ -match '^DATABASE_URL\s*=' } | Select-Object -First 1
    if (-not $line) { throw "ไม่พบ DATABASE_URL" }
    $value = $line -replace '^DATABASE_URL\s*=\s*', ''
    $value = $value -replace '^["\''']|["\''']$', ''
    return $value
}

function Parse-ConnectionString {
    param([string]$Url)
    $re = '^mysql://(?<user>[^:@]+)(:(?<pass>[^@]*))?@(?<host>[^:/]+)(:(?<port>\d+))?/(?<db>[^?]+)'
    $m = [regex]::Match($Url, $re)
    if (-not $m.Success) { throw "DATABASE_URL ไม่ถูกต้อง" }
    return [PSCustomObject]@{
        User = $m.Groups['user'].Value
        Pass = $m.Groups['pass'].Value
        Host = $m.Groups['host'].Value
        Port = if ($m.Groups['port'].Success) { $m.Groups['port'].Value } else { '3306' }
        Db   = $m.Groups['db'].Value
    }
}

Write-Host "=== POS Database Restore ==="
if (-not (Test-Path $BackupFile)) { throw "ไม่พบไฟล์แบ็กอัป $BackupFile" }

$mysql = Find-MySql
$conn = Parse-ConnectionString -Url (Get-DatabaseUrl -Path $EnvFile)

Write-Warning "การกู้คืนจะเขียนทับฐานข้อมูล $($conn.Db) บน $($conn.Host):$($conn.Port)"
$confirm = Read-Host "พิมพ์ YES เพื่อดำเนินการ"
if ($confirm -ne 'YES') { Write-Host "ยกเลิกการกู้คืน"; exit 0 }

$args = @(
    "-u", $conn.User,
    "-h", $conn.Host,
    "-P", $conn.Port,
    $conn.Db
)
if ($conn.Pass) { $args = @("--password=$($conn.Pass)") + $args }

Get-Content $BackupFile -Raw | & $mysql @args
if ($LASTEXITCODE -ne 0) { throw "กู้คืนล้มเหลว" }

Write-Host "กู้คืนสำเร็จ"
