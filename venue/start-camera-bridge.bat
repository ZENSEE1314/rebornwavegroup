@echo off
title Camera bridge
REM Cameras are set in camera.config.json next to this file (host, user, password). Needs Node 18+ and ffmpeg (winget install Gyan.FFmpeg).
REM Keep this window open. It prints the address to open on the venue Wi-Fi; the address holds a key, do not share it.
node "%~dp0camera-bridge.mjs"
pause
