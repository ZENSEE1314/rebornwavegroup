import { describe, it } from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error plain .mjs program
import { createBridge, exactSong, findBox, isBox, parseJsonp, pickSong, singerNames } from "./karaoke-bridge.mjs";

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

describe("exact songs and singers", () => {
  const songs = [
    { sONGBM: "1", sONGNAME: "Love(T.I)", sINGER: "Love  张学友", cLOUD: 0 },
    { sONGBM: "2", sONGNAME: "Love", sINGER: "Love  Other Singer", cLOUD: 0 },
    { sONGBM: "3", sONGNAME: "Love Me", sINGER: "Love Me  Nu'est", cLOUD: 0 },
    { sONGBM: "4", sONGNAME: "小幸运", sINGER: "Xiao Xing Yun  Hebe(田馥甄)", cLOUD: 0 },
  ];
  const singersList = [
    { name: "张学友", picture: "11001.jpg", pinyin: "Zhang Xue You", qt_name: "" },
    { name: "田馥甄", picture: "11002.jpg", pinyin: "Tian Fu Zhen", qt_name: "Hebe" },
    { name: "Nu'est", picture: "singer_photo.png", pinyin: "Nuest", qt_name: "" },
    { name: "Other Singer", picture: "11003.jpg", pinyin: "Other Singer", qt_name: "" },
  ];
  const bridge = () => createBridge({ cloudUrl: "https://c.test", token: "t", boxUrl: "http://box/demo", catalog: songs, singers: singersList, log: () => {} });

  it("should read the singers after the double space", () => {
    assert.deepEqual(singerNames("Xiao Xing Yun  Hebe(田馥甄), 张学友"), ["Hebe(田馥甄)", "张学友"]);
  });
  it("should pick the song with the same title AND singer, not just the same title", () => {
    assert.equal(exactSong(songs, "Love", "张学友")?.sONGBM, "1");
    assert.equal(exactSong(songs, "Love", "Other Singer")?.sONGBM, "2");
  });
  it("should find nothing when the singer does not match, rather than a wrong song", () => {
    assert.equal(exactSong(songs, "Love", "Someone Else"), null);
  });
  it("should never match a title that only contains the requested words", () => {
    assert.equal(exactSong([songs[2]], "Love", ""), null);
  });
  it("should match a singer written as Hebe(田馥甄) by the Chinese name", () => {
    assert.equal(exactSong(songs, "小幸运", "田馥甄")?.sONGBM, "4");
  });
  it("should list only singers that have songs, with their photo file", () => {
    const page = bridge().singersPage("", 1);
    const byName = new Map(page.singers.map((y: any) => [y.name, y]));
    assert.deepEqual([byName.get("张学友")?.photo, byName.get("田馥甄")?.photo, byName.get("Nu'est")?.photo], ["11001.jpg", "11002.jpg", ""]);
    assert.ok(page.singers.every((y: any) => y.songs > 0));
  });
  it("should find a singer by the English name", () => {
    assert.deepEqual(bridge().singersPage("hebe", 1).singers.map((x: any) => x.name), ["田馥甄"]);
  });
  it("should list one singer's songs with that singer's photo", () => {
    const answer = bridge().songsOfSinger("田馥甄", 1);
    assert.deepEqual(answer.songs.map((x: any) => [x.code, x.title, x.photo]), [["4", "小幸运", "11002.jpg"]]);
  });
});

describe("the singer's choices: original voice, repeat, and the box's own list", () => {
  const catalog = [{ sONGBM: "10", sONGNAME: "Love", sINGER: "Love  Beyond", cLOUD: 0 }];
  const make = (state: { board: any; count: number; queued?: any[] }) => {
    const commands: string[] = []; const posted: any[] = [];
    const fetchImpl = async (url: string, init?: any) => {
      const u = new URL(url);
      const reply = (value: unknown) => ({ ok: true, status: 200, text: async () => `cb(${JSON.stringify(value)})`, json: async () => value });
      if (u.pathname.endsWith("/api/karaoke/queue")) return reply(state.board);
      if (u.pathname.endsWith("/api/karaoke/box-state")) { posted.push(JSON.parse(init.body)); return reply({}); }
      if (u.pathname.endsWith("/api/karaoke/next")) return reply({});
      if (u.pathname.endsWith("PlaylistServlet")) return reply({ number: String(state.count), songList: JSON.stringify(state.queued || []) });
      if (u.pathname.endsWith("CommandServlet")) { commands.push(u.searchParams.get("cmd")!); return reply({}); }
      throw new Error("unexpected " + url);
    };
    return { commands, posted, bridge: createBridge({ cloudUrl: "https://c.test", token: "t", boxUrl: "http://box/demo", fetchImpl, catalog, log: () => {} }) };
  };
  const board = (extra: object = {}) => ({ paused: false, nowPlaying: { id: 1, title: "Love", artist: "Beyond", vocal: "karaoke", repeat: 0, ...extra }, queue: [] });

  it("should leave the voice off for a karaoke song", async () => {
    const w = make({ board: board(), count: 0 });
    await w.bridge.tick();
    assert.deepEqual(w.commands, ["Add1"]);
  });
  it("should switch the singer's own voice on before the song is ordered", async () => {
    const w = make({ board: board({ vocal: "original" }), count: 0 });
    await w.bridge.tick();
    assert.deepEqual(w.commands, ["MuOr", "Add1"]);
  });
  it("should switch it back off for the next singer who wants no voice", async () => {
    const state = { board: board({ vocal: "original" }), count: 0 };
    const w = make(state);
    await w.bridge.tick();                       // voice on
    state.count = 1; await w.bridge.tick();      // playing
    state.count = 0; await w.bridge.tick();      // finished
    state.board = board({ id: 2, vocal: "karaoke" });
    await w.bridge.tick();
    assert.deepEqual(w.commands, ["MuOr", "Add1", "MuOr", "Add1"]);
  });
  it("should play the song again when the singer presses Repeat", async () => {
    const state = { board: board(), count: 0 };
    const w = make(state);
    await w.bridge.tick(); state.count = 1; await w.bridge.tick();
    state.board = board({ repeat: 1 });
    assert.equal(await w.bridge.tick(), "repeated");
    assert.deepEqual(w.commands, ["Add1", "Reset"]);
    assert.equal(await w.bridge.tick(), "playing");   // the same press is not repeated twice
  });
  it("should report the songs waiting on the box itself", async () => {
    const w = make({ board: { paused: false, nowPlaying: null, queue: [] }, count: 2, queued: [{ sONGNAME: "Ordered by hand", sINGER: "Ordered  Someone" }] });
    await w.bridge.tick();
    assert.deepEqual(w.posted[0].songs, [{ title: "Ordered by hand", artist: "Someone" }]);
  });
});

describe("finding the box on the network", () => {
  const BOX_IP = "192.168.1.20";
  // A box answers its song search with a song list; every other address does not answer at all.
  const network = async (url: string) => {
    if (url.startsWith(`http://${BOX_IP}:8084/demo/SearchServlet`)) return { text: async () => `cb({"songList":"[]"})` };
    throw new Error("no answer");
  };
  const interfaces = { Ethernet: [{ family: "IPv4", internal: false, address: "192.168.1.50" }], Loopback: [{ family: "IPv4", internal: true, address: "127.0.0.1" }], V6: [{ family: "IPv6", internal: false, address: "fe80::1" }] };

  it("should find a box that answers on the same network", async () => {
    assert.equal(await findBox({ fetchImpl: network, interfaces }), `http://${BOX_IP}:8084/demo`);
  });
  it("should return null when no address answers", async () => {
    assert.equal(await findBox({ fetchImpl: async () => { throw new Error("no answer"); }, interfaces }), null);
  });
  it("should not look at the loopback or IPv6 addresses", async () => {
    const seen = new Set<string>();
    await findBox({ fetchImpl: async (url: string) => { seen.add(url.split("/")[2]); throw new Error("no"); }, interfaces });
    assert.ok(![...seen].some((host) => host.startsWith("127.")));
  });
  it("should know a box by its song list", async () => {
    assert.equal(await isBox(`http://${BOX_IP}:8084/demo`, network), true);
  });
  it("should not take an ordinary web page for a box", async () => {
    assert.equal(await isBox("http://192.168.1.1:8084/demo", async () => ({ text: async () => "<html>router</html>" })), false);
  });
});
