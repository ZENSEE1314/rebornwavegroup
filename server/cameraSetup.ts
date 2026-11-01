// The one-click setup file for the camera bridge on a venue PC (Admin › Security › Cameras › Set up the venue PC).
// It holds the cameras the admin typed, this company's address and bridge token; the file is made on request and nothing of it is saved on the server.
export interface SetupCamera { name: string; host: string; user: string; password: string; channel: number }
export interface CameraSetupInput { cloudUrl: string; token: string; tenantSlug: string; cameras: SetupCamera[] }

export const MAX_SETUP_CAMERAS = 16;
const MAX_TEXT = 80;
const MAX_CHANNEL = 64;
const CRLF = "\r\n";
const SAFE = /^[A-Za-z0-9._:/-]*$/; // nothing a command line could misread
const HOST = /^[A-Za-z0-9.-]{1,100}$/;

/** Keeps only what the bridge can use; returns null when no camera is usable. */
export function cleanSetupCameras(raw: unknown): SetupCamera[] | null {
  if (!Array.isArray(raw)) return null;
  const cameras: SetupCamera[] = [];
  for (const entry of raw.slice(0, MAX_SETUP_CAMERAS)) {
    const item = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
    const host = String(item.host ?? "").trim();
    const user = String(item.user ?? "").trim().slice(0, MAX_TEXT);
    const password = String(item.password ?? "").slice(0, MAX_TEXT);
    if (!HOST.test(host) || !user || !password) continue;
    const channel = Math.floor(Number(item.channel)) || 1;
    cameras.push({
      name: String(item.name ?? "").trim().slice(0, MAX_TEXT) || `Camera ${cameras.length + 1}`,
      host, user, password, channel: Math.min(Math.max(channel, 1), MAX_CHANNEL),
    });
  }
  return cameras.length > 0 ? cameras : null;
}

export function cameraSetupBat({ cloudUrl, token, tenantSlug, cameras }: CameraSetupInput): string {
  if (!SAFE.test(cloudUrl) || !SAFE.test(token) || !SAFE.test(tenantSlug)) throw new Error("setup values contain characters that are not allowed");
  const config = { cameras: cameras.map((cam, i) => ({ id: `cam${i + 1}`, ...cam })), cloudUrl, cloudToken: token, ...(tenantSlug ? { tenantSlug } : {}) };
  // Base64 so a symbol in a camera password can never be misread by the command line.
  const configText = Buffer.from(JSON.stringify(config, null, 2), "utf8").toString("base64");
  const download = `try { Invoke-WebRequest -UseBasicParsing '${cloudUrl}/api/camera/bridge.mjs' -OutFile 'camera-bridge.new'; Move-Item -Force 'camera-bridge.new' 'camera-bridge.mjs' } catch { Write-Host 'Could not get the latest version, using the one here.' }`;
  const writeConfig = `[IO.File]::WriteAllBytes('camera.config.json', [Convert]::FromBase64String('${configText}'))`;
  return [
    "@echo off",
    "title Camera bridge",
    "REM Made by the app (Admin - Security - Cameras). It holds the camera passwords: keep it on the venue PC and do not share it. Keep this window open while the venue is open.",
    "cd /d \"%~dp0\"",
    "where node >nul 2>nul",
    "if errorlevel 1 (",
    "  echo Node.js is needed: install the LTS version from https://nodejs.org and run this file again.",
    "  pause",
    "  exit /b 1",
    ")",
    "where ffmpeg >nul 2>nul",
    "if errorlevel 1 (",
    "  echo ffmpeg is needed to read the cameras. Installing it now ...",
    "  winget install -e --id Gyan.FFmpeg --accept-source-agreements --accept-package-agreements",
    "  echo Close this window and run this file again so ffmpeg is found.",
    "  pause",
    "  exit /b 1",
    ")",
    "echo Getting the latest camera bridge ...",
    `powershell -NoProfile -Command "${download}"`,
    "if not exist camera-bridge.mjs (",
    "  echo The camera bridge could not be downloaded. Check the internet and run this file again.",
    "  pause",
    "  exit /b 1",
    ")",
    `powershell -NoProfile -Command "${writeConfig}"`,
    "node camera-bridge.mjs",
    "pause",
    "",
  ].join(CRLF);
}
