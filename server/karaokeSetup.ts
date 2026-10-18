// The one-click setup file for the karaoke bridge on a venue PC (Admin › Requests › Karaoke system › Download the setup file).
// It holds this company's address, token and company name, gets the latest bridge program from the app, and starts it; the bridge finds the box itself.
export interface SetupFileInput { cloudUrl: string; token: string; tenantSlug: string }

const CRLF = "\r\n";
const SAFE = /^[A-Za-z0-9._:/-]*$/; // nothing a command line could misread

export function karaokeSetupBat({ cloudUrl, token, tenantSlug }: SetupFileInput): string {
  if (!SAFE.test(cloudUrl) || !SAFE.test(token) || !SAFE.test(tenantSlug)) throw new Error("setup values contain characters that are not allowed");
  const download = `try { Invoke-WebRequest -UseBasicParsing '${cloudUrl}/api/karaoke/bridge.mjs' -OutFile 'karaoke-bridge.new'; Move-Item -Force 'karaoke-bridge.new' 'karaoke-bridge.mjs' } catch { Write-Host 'Could not get the latest version, using the one here.' }`;
  return [
    "@echo off",
    "title Karaoke bridge",
    "REM Made by the app (Admin - Requests - Karaoke system). Keep this window open while the venue is open.",
    "cd /d \"%~dp0\"",
    "where node >nul 2>nul",
    "if errorlevel 1 (",
    "  echo Node.js is needed: install the LTS version from https://nodejs.org and run this file again.",
    "  pause",
    "  exit /b 1",
    ")",
    "echo Getting the latest karaoke bridge ...",
    `powershell -NoProfile -Command "${download}"`,
    "if not exist karaoke-bridge.mjs (",
    "  echo The karaoke bridge could not be downloaded. Check the internet and run this file again.",
    "  pause",
    "  exit /b 1",
    ")",
    `set CLOUD_URL=${cloudUrl}`,
    `set KARAOKE_TOKEN=${token}`,
    `set TENANT_SLUG=${tenantSlug}`,
    "node karaoke-bridge.mjs",
    "pause",
    "",
  ].join(CRLF);
}
