// Which songs of a wanted list are on the karaoke box? Read-only: it only reads files, never talks to the box.
// Run on the venue PC, after the karaoke bridge has read the box's song list once (venue/karaoke-catalog.json):
//   node venue/check-new-songs.mjs [path to karaoke-catalog.json] [path to the song list]
// Defaults: venue/karaoke-catalog.json and venue/new-chinese-songs.json. Prints a table and writes venue/new-songs-check.csv
// (git-ignored). Each song is: "on the box" (stored on the box), "cloud only" (the box can fetch it from its vendor's cloud;
// our app hides cloud songs unless SHOW_CLOUD_SONGS=1), "title only, other singer" (a song of that name by someone else:
// check it by hand), or "missing". The box's own list has no file names or video format, so the song number is all it gives.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// Lower case, brackets ("(Live)", "(伴奏)") and every space / punctuation mark dropped, so "Someone Like You" = "someonelikeyou".
export const squash = (value) => String(value || "").toLowerCase().replace(/[(（\[【][^)）\]】]*[)）\]】]/g, "").replace(/[^\p{L}\p{N}]+/gu, "");

// Status of one wanted song against the box's list (rows with sONGBM, sONGNAME, sINGER, cLOUD).
export function checkSong(wanted, catalog) {
  const titles = (wanted.titles?.length ? wanted.titles : [wanted.title]).map(squash).filter(Boolean);
  const singers = (wanted.singers?.length ? wanted.singers : [wanted.singer]).map(squash).filter(Boolean);
  const sameTitle = catalog.filter((row) => titles.includes(squash(row.sONGNAME)));
  const bySinger = sameTitle.filter((row) => singers.some((name) => squash(row.sINGER).includes(name)));
  const stored = bySinger.filter((row) => !Number(row.cLOUD));
  const codes = (rows) => rows.map((row) => String(row.sONGBM));
  if (stored.length) return { status: "on the box", codes: codes(stored) };
  if (bySinger.length) return { status: "cloud only", codes: codes(bySinger) };
  if (sameTitle.length) return { status: "title only, other singer", codes: codes(sameTitle), otherSingers: [...new Set(sameTitle.map((row) => String(row.sINGER || "").trim()))] };
  return { status: "missing", codes: [] };
}

const csvCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

export function toCsv(results) {
  const lines = [["Song", "Singer", "Status", "Box song number(s)", "Other singers with this title", "Source"].map(csvCell).join(",")];
  for (const { song, result } of results) {
    lines.push([song.title, song.singer, result.status, result.codes.join(" "), (result.otherSingers || []).join(" / "), song.source].map(csvCell).join(","));
  }
  return "﻿" + lines.join("\r\n") + "\r\n"; // BOM so Excel shows the Chinese text
}

function main() {
  const catalogFile = path.resolve(process.argv[2] || path.join(HERE, "karaoke-catalog.json"));
  const listFile = path.resolve(process.argv[3] || path.join(HERE, "new-chinese-songs.json"));
  if (!fs.existsSync(catalogFile)) {
    console.error(`No song list of the box at ${catalogFile}.\nStart the karaoke bridge once (Start-Karaoke-Bridge.bat) and wait until it says "song list ... songs" (about 15 minutes the first time), then run this again.`);
    process.exit(1);
  }
  const catalog = JSON.parse(fs.readFileSync(catalogFile, "utf8"));
  const wanted = JSON.parse(fs.readFileSync(listFile, "utf8")).songs;
  const results = wanted.map((song) => ({ song, result: checkSong(song, catalog) }));
  const stored = catalog.filter((row) => !Number(row.cLOUD)).length;
  console.log(`Box song list: ${catalog.length} songs (${stored} stored on the box, ${catalog.length - stored} cloud).\n`);
  for (const status of ["missing", "title only, other singer", "cloud only", "on the box"]) {
    const group = results.filter(({ result }) => result.status === status);
    if (!group.length) continue;
    console.log(`== ${status} (${group.length}) ==`);
    for (const { song, result } of group) {
      const extra = result.codes.length ? `  #${result.codes.join(" #")}` : "";
      const others = result.otherSingers ? `  (by: ${result.otherSingers.join(" / ")})` : "";
      console.log(`  ${song.title} - ${song.singer}${extra}${others}`);
    }
    console.log("");
  }
  const out = path.join(HERE, "new-songs-check.csv");
  fs.writeFileSync(out, toCsv(results));
  console.log(`Saved: ${out}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
