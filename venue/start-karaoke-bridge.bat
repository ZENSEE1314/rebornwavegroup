@echo off
title Karaoke bridge
REM Paste the token from the app: Admin - Requests - Karaoke system - Make token. Keep this window open while the venue is open.
set CLOUD_URL=https://rebornwave.group
set KARAOKE_TOKEN=PASTE_THE_TOKEN_HERE
set BOX_URL=http://192.168.100.4:8084/demo
REM Needs Node 18 or newer (nodejs.org). A company on the shared platform host also sets TENANT_SLUG.
node "%~dp0karaoke-bridge.mjs"
pause
