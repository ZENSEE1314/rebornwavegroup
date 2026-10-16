@echo off
cd /d "%~dp0"
if not exist node_modules ( echo Installing the launcher... & call npm install )
node start-venue.mjs
pause
