import { strict as assert } from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";
import { clearYoutubeCache, decodeEntities, isYoutubeCode, karaokeQuery, searchYoutubeKaraoke, songsFromAnswer } from "./youtubeSearch";

const answer = { items: [{ id: { videoId: "abcdefghijk" }, snippet: { title: "Rock &amp; Roll (Karaoke Version)", channelTitle: "Sing King" } }, { id: { videoId: "bad" }, snippet: { title: "Broken id" } }] };

describe("YouTube karaoke search", () => {
  beforeEach(() => { process.env.YOUTUBE_API_KEY = "test-key"; clearYoutubeCache(); });
  afterEach(() => { delete process.env.YOUTUBE_API_KEY; });

  it("should add the word karaoke to what was typed", () => {
    assert.equal(karaokeQuery("Qing Hua Ci"), "Qing Hua Ci karaoke");
  });

  it("should not add karaoke when it is already typed", () => {
    assert.equal(karaokeQuery("Yesterday Karaoke"), "Yesterday Karaoke");
  });

  it("should turn HTML entities of a title into letters", () => {
    assert.equal(decodeEntities("Rock &amp; Roll &#39;n&#39; &quot;Soul&quot;"), "Rock & Roll 'n' \"Soul\"");
  });

  it("should list a video as a song numbered yt:<id> and drop one with a broken id", () => {
    const songs = songsFromAnswer(answer);
    assert.deepEqual(songs.map((song) => song.karaokeCode), ["yt:abcdefghijk"]);
  });

  it("should name the channel in the artist so members see it is a YouTube song", () => {
    assert.equal(songsFromAnswer(answer)[0].artist, "▶ YouTube · Sing King");
  });

  it("should accept only well-formed YouTube song numbers", () => {
    assert.deepEqual([isYoutubeCode("yt:abcdefghijk"), isYoutubeCode("yt:short"), isYoutubeCode("1234")], [true, false, false]);
  });

  it("should return nothing and ask nobody when there is no key", async () => {
    delete process.env.YOUTUBE_API_KEY;
    let asked = 0;
    const songs = await searchYoutubeKaraoke("love", async () => { asked++; return { ok: true, json: async () => answer }; });
    assert.deepEqual([songs.length, asked], [0, 0]);
  });

  it("should answer a repeated search from memory so the daily quota lasts", async () => {
    let asked = 0;
    const fetchOnce = async () => { asked++; return { ok: true, json: async () => answer }; };
    await searchYoutubeKaraoke("love", fetchOnce);
    await searchYoutubeKaraoke("Love", fetchOnce);
    assert.equal(asked, 1);
  });

  it("should return nothing when YouTube refuses the call", async () => {
    const songs = await searchYoutubeKaraoke("love", async () => ({ ok: false, json: async () => ({}) }));
    assert.equal(songs.length, 0);
  });

  it("should return nothing when the call fails", async () => {
    const songs = await searchYoutubeKaraoke("love", async () => { throw new Error("offline"); });
    assert.equal(songs.length, 0);
  });
});
