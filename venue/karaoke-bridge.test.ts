import { describe, it } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error plain .mjs program
import { createBridge, parseJsonp, pickSong } from "./karaoke-bridge.mjs";

// Answers shaped like the real box: JSONP, and the song list is a JSON string inside.
const songList = JSON.stringify([
  { cLOUD: 1, sINGER: "Love  Cloud Singer", sONGBM: "999", sONGNAME: "Love" },
  { cLOUD: 0, sINGER: "Love  Beyond", sONGBM: "10014714", sONGNAME: "Love(Concert)(T.I)" },
  { cLOUD: 0, sINGER: "Love  张学友", sONGBM: "10014728", sONGNAME: "Love(T.I)" },
  { cLOUD: 0, sINGER: "Other  Someone", sONGBM: "1", sONGNAME: "Something else" },
]);

function world(initial: { nowPlaying: any; paused?: boolean; boxCount?: number }) {
  const state = { board: { paused: !!initial.paused, nowPlaying: initial.nowPlaying }, boxCount: initial.boxCount ?? 0, commands: [] as string[], nextCalls: [] as any[] };
  const fetchImpl = async (url: string, init?: any) => {
    const u = new URL(url);
    const reply = (value: unknown) => ({ ok: true, status: 200, text: async () => `cb(${JSON.stringify(value)})`, json: async () => value });
    if (u.pathname.endsWith("/api/karaoke/queue")) return reply(state.board);
    if (u.pathname.endsWith("/api/karaoke/next")) { state.nextCalls.push(JSON.parse(init.body)); state.board = { ...state.board, nowPlaying: null }; return reply({}); }
    if (u.pathname.endsWith("SearchServlet")) return reply({ number: "4", page: "1", songList });
    if (u.pathname.endsWith("PlaylistServlet")) return reply({ number: String(state.boxCount) });
    if (u.pathname.endsWith("CommandServlet")) { state.commands.push(`${u.searchParams.get("cmd")}:${u.searchParams.get("cmdValue")}`); return reply({ cmd: u.searchParams.get("cmd") }); }
    throw new Error("unexpected " + url);
  };
  let clock = 1_000_000;
  const bridge = createBridge({ cloudUrl: "https://cloud.test", token: "t", boxUrl: "http://box/demo", fetchImpl, log: () => {}, now: () => clock });
  return { state, bridge, advance: (ms: number) => { clock += ms; } };
}
const song = (extra: object = {}) => ({ id: 7, title: "Love", artist: "张学友", ...extra });

describe("reading the box", () => {
  it("should read JSONP with the wrapper cut off", () => assert.deepEqual(parseJsonp('cb({"number":"2"})'), { number: "2" }));
  it("should pick the song with the same title and artist before a cloud copy of the title", () => {
    const picked = pickSong(JSON.parse(songList), "Love", "张学友");
    assert.equal(picked.sONGBM, "10014728");
  });
  it("should pick nothing when no title matches", () => assert.equal(pickSong(JSON.parse(songList), "Zzz", ""), null));
});

describe("karaoke bridge", () => {
  it("should order the song on now when the box is idle", async () => {
    const { bridge, state } = world({ nowPlaying: song() });
    assert.equal(await bridge.tick(), "ordered");
    assert.deepEqual(state.commands, ["Add1:10014728"]);
  });

  it("should use the song number the app already knows without searching", async () => {
    const { bridge, state } = world({ nowPlaying: song({ karaokeCode: "555" }) });
    await bridge.tick();
    assert.deepEqual(state.commands, ["Add1:555"]);
  });

  it("should not order anything while the app queue is paused", async () => {
    const { bridge, state } = world({ nowPlaying: song(), paused: true });
    assert.equal(await bridge.tick(), "idle");
    assert.deepEqual(state.commands, []);
  });

  it("should wait while someone plays songs on the box by hand", async () => {
    const { bridge, state } = world({ nowPlaying: song(), boxCount: 2 });
    assert.equal(await bridge.tick(), "box busy");
    assert.deepEqual(state.commands, []);
  });

  it("should tell the app the song ended once the box was busy and is idle again", async () => {
    const { bridge, state } = world({ nowPlaying: song() });
    await bridge.tick();
    state.boxCount = 1; assert.equal(await bridge.tick(), "playing");
    state.boxCount = 0; assert.equal(await bridge.tick(), "finished");
    assert.deepEqual(state.nextCalls, [{ finishedId: 7 }]);
  });

  it("should skip a song the box does not have", async () => {
    const { bridge, state } = world({ nowPlaying: song({ title: "Zzz nothing", artist: "" }) });
    assert.equal(await bridge.tick(), "not found");
    assert.deepEqual(state.nextCalls, [{ finishedId: 7, skip: true }]);
    assert.deepEqual(state.commands, []);
  });

  it("should cut the song on the box when the app skipped it", async () => {
    const { bridge, state } = world({ nowPlaying: song() });
    await bridge.tick();
    state.boxCount = 1; await bridge.tick();
    state.board = { paused: false, nowPlaying: { id: 8, title: "Next one", artist: "" } as any };
    assert.equal(await bridge.tick(), "cut");
    assert.deepEqual(state.commands, ["Add1:10014728", "Skip:"]);
  });

  it("should give up on a song the box never started", async () => {
    const { bridge, state, advance } = world({ nowPlaying: song() });
    await bridge.tick();
    assert.equal(await bridge.tick(), "starting");
    advance(30_000);
    assert.equal(await bridge.tick(), "lost");
    assert.deepEqual(state.nextCalls, [{ finishedId: 7, skip: true }]);
  });
});
