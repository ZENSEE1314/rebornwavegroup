import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MAX_NEXT_SONGS, MAX_TV_SCREENS, cleanSetup, screenCovers, songLinesFor, tableKey } from "./tvLogic";

let counter = 0;
const makeId = () => `id-${++counter}`;
const makeToken = () => (++counter).toString(16).padStart(24, "0");

describe("cleaning the TV setup", () => {
  it("should give a new TV an id, a secret token and the default overlay view", () => {
    const { screens } = cleanSetup({ screens: [{ name: "Bar" }] }, makeId, makeToken);
    assert.equal(screens.length, 1);
    assert.match(screens[0].token, /^[a-f0-9]{24}$/);
    assert.equal(screens[0].view, "overlay");
    assert.deepEqual(screens[0].tables, []);
  });

  it("should keep the id and token a TV already has", () => {
    const token = "a".repeat(24);
    const { screens } = cleanSetup({ screens: [{ id: "tv-main", token, name: "Main", view: "queue" }] }, makeId, makeToken);
    assert.equal(screens[0].id, "tv-main");
    assert.equal(screens[0].token, token);
    assert.equal(screens[0].view, "queue");
  });

  it("should replace a made-up token or view with safe ones", () => {
    const { screens } = cleanSetup({ screens: [{ token: "../../etc", view: "hacked" }] }, makeId, makeToken);
    assert.match(screens[0].token, /^[a-f0-9]{24}$/);
    assert.equal(screens[0].view, "overlay");
  });

  it("should never let two TVs share an id or a token", () => {
    const token = "b".repeat(24);
    const { screens } = cleanSetup({ screens: [{ id: "x", token }, { id: "x", token }] }, makeId, makeToken);
    assert.notEqual(screens[0].id, screens[1].id);
    assert.notEqual(screens[0].token, screens[1].token);
  });

  it("should allow only a sensible number of TVs and short names", () => {
    const many = Array.from({ length: MAX_TV_SCREENS + 5 }, () => ({ name: "n".repeat(100) }));
    const { screens } = cleanSetup({ screens: many }, makeId, makeToken);
    assert.equal(screens.length, MAX_TV_SCREENS);
    assert.equal(screens[0].name.length, 40);
  });

  it("should read tables from a comma separated line and drop repeats", () => {
    const { screens } = cleanSetup({ screens: [{ tables: "3, Table 4;4 ,, 5" }] }, makeId, makeToken);
    assert.deepEqual(screens[0].tables, ["3", "Table 4", "5"]);
  });

  it("should survive garbage", () => {
    assert.deepEqual(cleanSetup(null, makeId, makeToken), { screens: [] });
    assert.deepEqual(cleanSetup({ screens: "no" }, makeId, makeToken), { screens: [] });
    assert.equal(cleanSetup({ screens: [null, 5, "x"] }, makeId, makeToken).screens.length, 3);
  });
});

describe("which TV follows which table", () => {
  it("should treat different ways of writing a table as the same table", () => {
    assert.equal(tableKey("Table 5"), "5");
    assert.equal(tableKey("table5"), "5");
    assert.equal(tableKey(" 5 "), "5");
    assert.equal(tableKey("Meja 12"), "12");
    assert.equal(tableKey("5桌"), "5");
    assert.equal(tableKey("A 1"), "a1");
  });

  it("should let a TV with no tables chosen follow everything", () => {
    assert.equal(screenCovers({ tables: [] }, ["9"]), true);
    assert.equal(screenCovers({ tables: [] }, [null]), true);
  });

  it("should follow a table only when it was chosen", () => {
    const screen = { tables: ["3", "Table 4"] };
    assert.equal(screenCovers(screen, ["table 3"]), true);
    assert.equal(screenCovers(screen, ["4"]), true);
    assert.equal(screenCovers(screen, ["9"]), false);
    assert.equal(screenCovers(screen, [null, ""]), false);
  });

  it("should follow a gift when either the sender's or the receiver's table is chosen", () => {
    assert.equal(screenCovers({ tables: ["3"] }, ["9", "3"]), true);
    assert.equal(screenCovers({ tables: ["3"] }, ["9", "8"]), false);
  });
});

describe("the moving bar's songs", () => {
  const board = {
    nowPlaying: { title: "Now song", artist: "A", table: "5", name: "Ann" },
    queue: [
      { title: "One", artist: "", table: "3", name: "Bo" },
      { title: "Two", artist: "", table: "7", name: "Cy" },
      { title: "Three", artist: "", table: "3", name: "Di" },
    ],
  };

  it("should list everything for a TV that follows every table", () => {
    const { now, next } = songLinesFor(board, { tables: [] });
    assert.equal(now?.title, "Now song");
    assert.deepEqual(next.map((song) => song.title), ["One", "Two", "Three"]);
  });

  it("should list only the chosen tables, with the table next to each song", () => {
    const { now, next } = songLinesFor(board, { tables: ["3"] });
    assert.equal(now, null);
    assert.deepEqual(next.map((song) => `${song.title}@${song.table}`), ["One@3", "Three@3"]);
  });

  it("should cope with an empty queue and cap the list", () => {
    assert.deepEqual(songLinesFor({}, { tables: [] }), { now: null, next: [] });
    const long = { queue: Array.from({ length: 40 }, (_, i) => ({ title: `S${i}`, table: "1" })) };
    assert.equal(songLinesFor(long, { tables: [] }).next.length, MAX_NEXT_SONGS);
  });
});
