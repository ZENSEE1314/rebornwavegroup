# One-time set-up of the encrypted nightly backup on a Windows PC. Run it yourself in PowerShell (from the app folder):
#   powershell -ExecutionPolicy Bypass -File scripts\backup\setup-nightly.ps1
# It asks for the backup passphrase (typed here, never shown, never sent anywhere), saves it and the database address
# in a folder only your Windows user can read, and makes a task that runs the backup every night.
# Write the passphrase on paper too: without it a backup cannot be opened, and it cannot be recovered.
param(
  [string]$AppDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
  [string]$BackupDir = "$env:USERPROFILE\OneDrive\RebornBackups",
  [string]$Time = "03:30",
  [string]$DatabaseUrlFile = "C:\RebornStandby\database-url.txt"
)
$ErrorActionPreference = "Stop"
$secretDir = Join-Path $env:LOCALAPPDATA "RebornBackup"
New-Item -ItemType Directory -Force $secretDir, $BackupDir | Out-Null

$first = Read-Host "Backup passphrase (at least 16 characters)" -AsSecureString
$second = Read-Host "Type it again" -AsSecureString
$plain1 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($first))
$plain2 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($second))
if ($plain1 -ne $plain2) { throw "The two passphrases are different." }
if ($plain1.Length -lt 16) { throw "The passphrase needs at least 16 characters." }

$passFile = Join-Path $secretDir "passphrase.txt"
$urlFile = Join-Path $secretDir "database-url.txt"
[IO.File]::WriteAllText($passFile, $plain1)
Copy-Item $DatabaseUrlFile $urlFile -Force
foreach ($f in @($passFile, $urlFile)) {
  icacls $f /inheritance:r /grant:r "$($env:USERNAME):(R,W)" | Out-Null
}

$runner = Join-Path $secretDir "run-backup.cmd"
@"
@echo off
set BACKUP_DB_URL_FILE=$urlFile
set BACKUP_PASSPHRASE_FILE=$passFile
set BACKUP_DIR=$BackupDir
cd /d "$AppDir"
node scripts\backup\backup.mjs >> "$secretDir\backup.log" 2>&1
"@ | Set-Content -Encoding ASCII $runner

$action = New-ScheduledTaskAction -Execute $runner
$trigger = New-ScheduledTaskTrigger -Daily -At $Time
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -WakeToRun -ExecutionTimeLimit (New-TimeSpan -Hours 2)
Register-ScheduledTask -TaskName "RebornNightlyBackup" -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
Write-Host "Done. A backup runs every night at $Time into $BackupDir (30 kept). Log: $secretDir\backup.log"
Write-Host "Run one now to check:  Start-ScheduledTask RebornNightlyBackup"
