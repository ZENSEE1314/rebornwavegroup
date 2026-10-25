# Put the newly built app on the PC copy (C:\RebornStandby) and restart it. Run from PowerShell after `npm run build` in the working copy.
#   powershell -ExecutionPolicy Bypass -File toolbox\scripts\update-pc-copy.ps1
#   powershell -ExecutionPolicy Bypass -File toolbox\scripts\update-pc-copy.ps1 -WithModules     (after a dependency change)
#   powershell -ExecutionPolicy Bypass -File toolbox\scripts\update-pc-copy.ps1 -DryRun           (shows what it would do, changes nothing)
# The PC copy runs on the live database (STANDBY_MODE, background jobs off). Start-up takes a few minutes over the slow line;
# the script waits until it answers. It never prints or changes the database address.
param(
  [string]$Source = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
  [string]$Target = "C:\RebornStandby\app",
  [string]$TaskName = "RebornStandby",
  [int]$Port = 3999,
  [int]$WaitMinutes = 8,
  [switch]$WithModules,
  [switch]$DryRun
)
$ErrorActionPreference = "Stop"
if (-not (Test-Path "$Source\dist\index.js")) { throw "No build in $Source\dist. Run npm run build first." }
if ($DryRun) {
  Write-Host "DRY RUN: nothing is stopped, copied or started."
  Write-Host "Would stop task $TaskName and free port $Port."
  Write-Host "Would copy $Source\dist to $Target\dist$(if ($WithModules) { ", plus node_modules and package files" })."
  Write-Host "Would start $TaskName and wait up to $WaitMinutes minutes for http://127.0.0.1:$Port/api/v1/tenant/resolve."
  Write-Host "Target exists: $(Test-Path $Target)   Task exists: $([bool](Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue))"
  exit 0
}

Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 2

robocopy "$Source\dist" "$Target\dist" /MIR /NFL /NDL /NJH /NJS /NP | Out-Null
if ($WithModules) {
  robocopy "$Source\node_modules" "$Target\node_modules" /MIR /NFL /NDL /NJH /NJS /NP /XD ".cache" | Out-Null
  Copy-Item "$Source\package.json", "$Source\package-lock.json" $Target -Force
}
Start-ScheduledTask -TaskName $TaskName
Write-Host "Restarted $TaskName. Waiting for port $Port ..."

$deadline = (Get-Date).AddMinutes($WaitMinutes)
while ((Get-Date) -lt $deadline) {
  try {
    $answer = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/api/v1/tenant/resolve" -UseBasicParsing -TimeoutSec 10
    if ($answer.StatusCode -eq 200) { Write-Host "UP: the PC copy answers on port $Port."; exit 0 }
  } catch { Start-Sleep -Seconds 5 }
}
Write-Host "Not answering after $WaitMinutes minutes. Look at C:\RebornStandby\server.log."
exit 1
