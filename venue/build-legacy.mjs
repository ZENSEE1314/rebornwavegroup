// Builds venue/legacy/karaoke-bridge-legacy.cjs: the karaoke bridge rewritten for Node.js 12, the newest Node that runs on Windows 7.
//   node venue/build-legacy.mjs
// The result is committed (the app serves it at /api/karaoke/bridge-legacy.cjs); a test rebuilds it and fails if it is out of date.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const here = path.dirname(fileURLToPath(import.meta.url));
const NODE_TARGET = "node12";
const IMPORT_META_URL = "__importMetaUrl";

export async function buildLegacyBridge() {
  const shim = fs.readFileSync(path.join(here, "legacy", "legacy-shim.cjs"), "utf8");
  const result = await build({
    entryPoints: [path.join(here, "karaoke-bridge.mjs")],
    bundle: true, platform: "node", format: "cjs", target: NODE_TARGET, write: false, legalComments: "none",
    define: { "import.meta.url": IMPORT_META_URL },
    banner: { js: `${shim}\nconst ${IMPORT_META_URL} = require("url").pathToFileURL(__filename).href;` },
  });
  return result.outputFiles[0].text;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(path.join(here, "legacy", "karaoke-bridge-legacy.cjs"), await buildLegacyBridge());
  console.log("venue/legacy/karaoke-bridge-legacy.cjs written");
}
