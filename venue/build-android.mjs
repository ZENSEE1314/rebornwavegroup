// Builds tv-overlay/app/src/main/assets/bridge.js: the karaoke bridge as the Android app on the karaoke box runs it (in a hidden WebView).
//   node venue/build-android.mjs
// The result is committed (the app build on GitHub has no Node step); a test rebuilds it and fails if it is out of date.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const here = path.dirname(fileURLToPath(import.meta.url));
export const ANDROID_BRIDGE_FILE = path.join(here, "..", "tv-overlay", "app", "src", "main", "assets", "bridge.js");
const WEBVIEW_TARGET = "chrome64"; // the oldest WebView that knows the \p{L} letters the bridge searches with
const IMPORT_META_URL = "file:///bridge.js";

export async function buildAndroidBridge() {
  const shim = fs.readFileSync(path.join(here, "android", "host-shim.js"), "utf8");
  const shimOf = (name) => path.join(here, "android", "shims", `${name}.mjs`);
  const result = await build({
    entryPoints: [path.join(here, "android", "main.mjs")],
    bundle: true, platform: "browser", format: "iife", target: WEBVIEW_TARGET, write: false, legalComments: "none",
    alias: { "node:fs": shimOf("fs"), "node:os": shimOf("os"), "node:path": shimOf("path"), "node:url": shimOf("url") },
    define: { "import.meta.url": JSON.stringify(IMPORT_META_URL) },
    banner: { js: shim },
  });
  return result.outputFiles[0].text;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fs.mkdirSync(path.dirname(ANDROID_BRIDGE_FILE), { recursive: true });
  fs.writeFileSync(ANDROID_BRIDGE_FILE, await buildAndroidBridge());
  console.log(`${path.relative(process.cwd(), ANDROID_BRIDGE_FILE)} written`);
}
