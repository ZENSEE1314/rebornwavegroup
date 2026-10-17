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

describe("searching the box for members", () => {
  it("should run the members' searches on the box and send the answers back", async () => {
    const posted: any[] = [];
    const fetchImpl = async (url: string, init?: any) => {
      const u = new URL(url);
      if (u.pathname.endsWith("/api/karaoke/jobs") && (!init || init.method !== "POST")) return { ok: true, status: 200, json: async () => ({ jobs: [{ id: "j1", q: "love" }] }), text: async () => "" };
      if (u.pathname.endsWith("/api/karaoke/jobs/j1")) { posted.push(JSON.parse(init.body)); return { ok: true, status: 200, json: async () => ({ ok: true }), text: async () => "" }; }
      if (u.pathname.endsWith("SearchServlet")) return { ok: true, status: 200, text: async () => `cb(${JSON.stringify({ number: "15", page: u.searchParams.get("page"), songList: songList })})`, json: async () => ({}) };
      throw new Error("unexpected " + url);
    };
    const bridge = createBridge({ cloudUrl: "https://cloud.test", token: "t", boxUrl: "http://box/demo", fetchImpl, log: () => {} });
    assert.equal(await bridge.serveSearches(), 1);
    assert.deepEqual(posted[0].songs.map((x: any) => x.code), ["999", "10014714", "10014728", "1"]);
    assert.equal(posted[0].songs[0].cloud, true);
  });
});

describe("Chinese songs (the box finds them by pinyin initials)", () => {
  const chinese = JSON.stringify([{ cLOUD: 0, sINGER: "Tian Hou  陈势安", sONGBM: "10117177", sONGNAME: "天后(T.I)" }, { cLOUD: 0, sINGER: "Other", sONGBM: "9", sONGNAME: "太好了" }]);
  const boxFor = (answers: Record<string, string>) => async (url: string, init?: any) => {
    const u = new URL(url);
    const reply = (value: unknown) => ({ ok: true, status: 200, text: async () => `cb(${JSON.stringify(value)})`, json: async () => value });
    if (u.pathname.endsWith("/api/karaoke/queue")) return reply({ paused: false, nowPlaying: { id: 7, title: "天后", artist: "", boxQueries: ["天后", "th"] } });
    if (u.pathname.endsWith("PlaylistServlet")) return reply({ number: "0" });
    if (u.pathname.endsWith("SearchServlet")) return reply({ number: "15", page: "1", songList: answers[u.searchParams.get("songName") || ""] || "[]" });
    if (u.pathname.endsWith("CommandServlet")) { orders.push(u.searchParams.get("cmdValue")); return reply({}); }
    throw new Error("unexpected " + url);
  };
  const orders: Array<string | null> = [];

  it("should order a Chinese song found by its initials when its characters find nothing", async () => {
    orders.length = 0;
    const bridge = createBridge({ cloudUrl: "https://c.test", token: "t", boxUrl: "http://box/demo", fetchImpl: boxFor({ th: chinese }), log: () => {} });
    assert.equal(await bridge.tick(), "ordered");
    assert.deepEqual(orders, ["10117177"]);
  });
});

describe("the box's song list kept by the bridge", () => {
  const list = [
    { sONGBM: "1", sONGNAME: "小幸运(T.I)", sINGER: "Xiao Xing Yun  田馥甄", cLOUD: 0 },
    { sONGBM: "2", sONGNAME: "幸运星", sINGER: "Xing Yun Xing  某人", cLOUD: 0 },
    { sONGBM: "3", sONGNAME: "Love Me", sINGER: "Love Me  Nu'est", cLOUD: 1 },
  ];
  const bridge = () => createBridge({ cloudUrl: "https://c.test", token: "t", boxUrl: "http://box/demo", catalog: list, log: () => {} });

  it("should find a Chinese title the box's own search misses, whole title first", () => {
    assert.deepEqual(bridge().searchLocal("小幸运").map((x: any) => x.sONGBM), ["1"]);
  });
  it("should find a song by the pinyin the box writes beside the singer", () => {
    assert.deepEqual(bridge().searchLocal("xing yun").map((x: any) => x.sONGBM), ["1", "2"]);
  });
  it("should answer a member's search from its own list without asking the box", async () => {
    const posted: any[] = [];
    const fetchImpl = async (url: string, init?: any) => {
      const u = new URL(url);
      if (u.pathname.endsWith("/api/karaoke/jobs") && (!init || init.method !== "POST")) return { ok: true, status: 200, json: async () => ({ jobs: [{ id: "j9", q: "幸运", queries: ["幸运", "xy"] }] }) };
      if (u.pathname.endsWith("/api/karaoke/jobs/j9")) { posted.push(JSON.parse(init.body)); return { ok: true, status: 200, json: async () => ({ ok: true }) }; }
      throw new Error("the box must not be asked: " + url);
    };
    const b = createBridge({ cloudUrl: "https://c.test", token: "t", boxUrl: "http://box/demo", fetchImpl, catalog: list, log: () => {} });
    await b.serveSearches();
    assert.deepEqual(posted[0].songs.map((x: any) => x.code), ["2", "1"]);
  });
});

describe("linking the app's library to the box", () => {
  it("should link library songs the box has and leave the others", async () => {
    const list = [
      { sONGBM: "1", sONGNAME: "小幸运(T.I)", sINGER: "Xiao Xing Yun  田馥甄", cLOUD: 0 },
      { sONGBM: "3", sONGNAME: "Love Me", sINGER: "Love Me  Nu'est", cLOUD: 0 },
    ];
    const library = [{ id: 10, title: "小幸运", artist: "田馥甄", code: null }, { id: 11, title: "Not in the box", artist: "", code: null }, { id: 12, title: "Love Me", artist: "Nu'est", code: "3" }];
    const posted: any[] = [];
    const fetchImpl = async (url: string, init?: any) => {
      const u = new URL(url);
      if (u.pathname.endsWith("/api/karaoke/library")) return { ok: true, status: 200, json: async () => library };
      if (u.pathname.endsWith("/api/karaoke/link")) { posted.push(JSON.parse(init.body)); return { ok: true, status: 200, json: async () => ({}) }; }
      throw new Error("unexpected " + url);
    };
    const bridge = createBridge({ cloudUrl: "https://c.test", token: "t", boxUrl: "http://box/demo", fetchImpl, catalog: list, log: () => {} });
    assert.equal(await bridge.linkLibrary(), 1);
    assert.deepEqual(posted[0].links, [{ id: 10, code: "1" }]);
  });
});

describe("starting the queue", () => {
  const worldWith = (board: any, boxCount: number) => {
    const nexts: any[] = [];
    const fetchImpl = async (url: string, init?: any) => {
      const u = new URL(url);
      const reply = (value: unknown) => ({ ok: true, status: 200, text: async () => `cb(${JSON.stringify(value)})`, json: async () => value });
      if (u.pathname.endsWith("/api/karaoke/queue")) return reply(board);
      if (u.pathname.endsWith("/api/karaoke/next")) { nexts.push(JSON.parse(init.body)); return reply({}); }
      if (u.pathname.endsWith("PlaylistServlet")) return reply({ number: String(boxCount) });
      throw new Error("unexpected " + url);
    };
    return { nexts, bridge: createBridge({ cloudUrl: "https://c.test", token: "t", boxUrl: "http://box/demo", fetchImpl, log: () => {} }) };
  };

  it("should start the first waiting song when nothing is on and the box is idle", async () => {
    const { bridge, nexts } = worldWith({ paused: false, nowPlaying: null, queue: [{ id: 5, title: "Love" }] }, 0);
    assert.equal(await bridge.tick(), "started");
    assert.deepEqual(nexts, [{}]);
  });
  it("should not start anything while the queue is paused", async () => {
    const { bridge, nexts } = worldWith({ paused: true, nowPlaying: null, queue: [{ id: 5, title: "Love" }] }, 0);
    assert.equal(await bridge.tick(), "idle");
    assert.deepEqual(nexts, []);
  });
  it("should wait while the box is busy with songs ordered by hand", async () => {
    const { bridge, nexts } = worldWith({ paused: false, nowPlaying: null, queue: [{ id: 5, title: "Love" }] }, 2);
    assert.equal(await bridge.tick(), "idle");
    assert.deepEqual(nexts, []);
  });
  it("should do nothing when nobody is waiting", async () => {
    const { bridge, nexts } = worldWith({ paused: false, nowPlaying: null, queue: [] }, 0);
    assert.equal(await bridge.tick(), "idle");
    assert.deepEqual(nexts, []);
  });
});
