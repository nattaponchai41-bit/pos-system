#Requires -Version 5.1
[CmdletBinding()]
param(
    [string]$TaskName = 'POS-Daily-Backup',
    [string]$Time = '23:00',
    [string]$BackupDir = '..\backups',
    [int]$KeepDays = 30,
    [string]$ExtraCopyDir = ''
)

$ErrorActionPreference = 'Stop'

$scriptDir = $PSScriptRoot
$actionScript = Join-Path $scriptDir 'backup-db.ps1'
if (-not (Test-Path $actionScript)) {
    throw "ไม่พบ backup-db.ps1"
}

$argList = "-ExecutionPolicy Bypass -File `"$actionScript`" -BackupDir `"$BackupDir`" -KeepDays $KeepDays"
if ($ExtraCopyDir) {
    $argList += " -ExtraCopyDir `"$ExtraCopyDir`""
}

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $argList -WorkingDirectory $scriptDir
$trigger = New-ScheduledTaskTrigger -Daily -At $Time
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force
Write-Host "สร้างงาน '$TaskName' สำเร็จ รันเวลา $Time ทุกวัน"
Write-Host "สคริปต์: $actionScript"
