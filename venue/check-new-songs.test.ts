import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { checkSong, squash, toCsv } from "./check-new-songs.mjs";

const catalog = [
  { sONGBM: "10001", sONGNAME: "任性", sINGER: "五月天", cLOUD: 0 },
  { sONGBM: "10002", sONGNAME: "奔騰", sINGER: "周深 zhoushen", cLOUD: 1 },
  { sONGBM: "10003", sONGNAME: "非凡", sINGER: "某歌手", cLOUD: 0 },
  { sONGBM: "10004", sONGNAME: "Someone Like You (Live)", sINGER: "張真源", cLOUD: 0 },
];

test("squash drops brackets, spaces and case", () => {
  assert.equal(squash("Someone Like You (Live)"), "someonelikeyou");
  assert.equal(squash("看著我的眼睛說【伴奏】"), "看著我的眼睛說");
});

test("a stored song is on the box", () => {
  assert.deepEqual(checkSong({ title: "任性", singer: "五月天" }, catalog), { status: "on the box", codes: ["10001"] });
});

test("a traditional spelling and a singer with pinyin beside it match; a cloud song is cloud only", () => {
  assert.deepEqual(checkSong({ title: "奔腾", titles: ["奔腾", "奔騰"], singer: "周深" }, catalog), { status: "cloud only", codes: ["10002"] });
});

test("same title by someone else is reported, not counted as found", () => {
  const result = checkSong({ title: "非凡", singers: ["刘德华", "劉德華"] }, catalog);
  assert.equal(result.status, "title only, other singer");
  assert.deepEqual(result.otherSingers, ["某歌手"]);
});

test("Latin titles ignore case and a (Live) tag; unknown songs are missing", () => {
  assert.equal(checkSong({ title: "someone like you", singers: ["张真源", "張真源"] }, catalog).status, "on the box");
  assert.equal(checkSong({ title: "座位", singer: "承桓" }, catalog).status, "missing");
});

test("the shipped song list is valid and the CSV has one row per song", () => {
  const list = JSON.parse(fs.readFileSync(new URL("./new-chinese-songs.json", import.meta.url), "utf8")).songs;
  assert.ok(list.length > 20);
  for (const song of list) assert.ok(song.title && song.singer && song.source, JSON.stringify(song));
  const csv = toCsv(list.map((song) => ({ song, result: checkSong(song, catalog) })));
  assert.equal(csv.trim().split("\r\n").length, list.length + 1);
});
