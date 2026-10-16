# Run once in PowerShell as Administrator: starts the venue server when this PC starts.
$bat = Join-Path $PSScriptRoot "start-venue.bat"
schtasks /Create /TN "RebornVenueServer" /TR "`"$bat`"" /SC ONSTART /RL HIGHEST /RU SYSTEM /F
Write-Host "Done. The venue server will start with Windows."

# Let phones on the venue Wi-Fi reach this PC (port 3000, private networks only) and keep the PC awake while plugged in.
netsh advfirewall firewall add rule name="Reborn venue server" dir=in action=allow protocol=TCP localport=3000 profile=private,domain | Out-Null
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
Write-Host "Firewall opened for port 3000 and sleep switched off while plugged in."
