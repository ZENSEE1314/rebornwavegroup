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

const NODE12_FOLDER = "https://nodejs.org/dist/v12.22.12/";

// The same setup file for a Windows 7 PC: Node.js 12 is the newest that runs there, so it uses node.exe put next to the file and the bridge built for Node 12.
// Node itself gets the program (Windows 7's own PowerShell cannot do the secure download).
export function karaokeSetupLegacyBat({ cloudUrl, token, tenantSlug }: SetupFileInput): string {
  if (!SAFE.test(cloudUrl) || !SAFE.test(token) || !SAFE.test(tenantSlug)) throw new Error("setup values contain characters that are not allowed");
  const download = `var u='${cloudUrl}/api/karaoke/bridge-legacy.cjs',f=require('fs');require(u.indexOf('https')===0?'https':'http').get(u,function(r){if(r.statusCode!==200){process.exit(2)}var o=f.createWriteStream('karaoke-bridge-legacy.new');r.pipe(o);o.on('close',function(){f.renameSync('karaoke-bridge-legacy.new','karaoke-bridge-legacy.cjs')})}).on('error',function(){process.exit(3)})`;
  return [
    "@echo off",
    "title Karaoke bridge (Windows 7)",
    "REM Made by the app (Admin - Requests - Karaoke system) for a Windows 7 PC. Keep this window open while the venue is open.",
    "cd /d \"%~dp0\"",
    "if not exist node.exe (",
    "  echo Windows 7 needs Node.js 12. Download node-v12.22.12-win-x64.zip, or win-x86 for a 32-bit PC, from",
    `  echo ${NODE12_FOLDER}`,
    "  echo open the zip and copy node.exe into the same folder as this file, then run this file again.",
    "  pause",
    "  exit /b 1",
    ")",
    "echo Getting the latest karaoke bridge ...",
    `node.exe -e "${download}"`,
    "if not exist karaoke-bridge-legacy.cjs (",
    "  echo The karaoke bridge could not be downloaded. Check the internet and run this file again.",
    "  pause",
    "  exit /b 1",
    ")",
    `set CLOUD_URL=${cloudUrl}`,
    `set KARAOKE_TOKEN=${token}`,
    `set TENANT_SLUG=${tenantSlug}`,
    "node.exe karaoke-bridge-legacy.cjs",
    "pause",
    "",
  ].join(CRLF);
}
