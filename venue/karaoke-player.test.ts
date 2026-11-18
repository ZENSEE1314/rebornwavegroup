import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const app = (name: string) => readFileSync(new URL(`../tv-overlay/app/src/main/${name}`, import.meta.url), "utf8");
const java = (name: string) => app(`java/group/rebornwave/tvoverlay/${name}`);

// The Android app cannot be run here, so these keep the rules of the built-in karaoke player from being lost in a later change.
describe("the built-in karaoke player of the box app", () => {
  it("should be a screen of the app, started from the set-up page", () => {
    assert.ok(app("AndroidManifest.xml").includes('android:name=".PlayerActivity"') && java("MainActivity.java").includes("PlayerActivity.class"));
  });

  it("should tell the app when a song ended so the next singer starts", () => {
    assert.ok(java("PlayerActivity.java").includes("Player.STATE_ENDED && !onYoutube) finishSong(false)") && java("QueueClient.java").includes('"/api/karaoke/next"'));
  });

  it("should start the first waiting song when nothing is on and the queue is not paused", () => {
    assert.ok(java("PlayerActivity.java").includes("board.now == null && !board.queue.isEmpty() && !board.paused"));
  });

  it("should skip a song the box has no video for instead of waiting for ever", () => {
    assert.ok(java("PlayerActivity.java").includes("finishSong(true)") && java("PlayerActivity.java").includes("songFiles.find(song.title, song.artist)"));
  });

  it("should keep the box's own connector off while the player is used, also after a restart", () => {
    assert.ok(java("BootReceiver.java").includes("!BridgeSettings.isPlayerMode(context)") && java("PlayerActivity.java").includes("BridgeService.stop(this)"));
  });

  it("should not draw gifts twice when the overlay already draws them", () => {
    assert.ok(java("PlayerActivity.java").includes("OverlayService.running || OverlayAccessibilityService.windowsNow != null"));
  });

  it("should follow the buttons staff press in the app", () => {
    const player = java("PlayerActivity.java");
    for (const button of ["Play", "Mute", "Music_up", "Music_down", "Reset", "Skip"]) assert.ok(player.includes(`"${button}"`), button);
  });

  it("should show 12 table boxes, four across and three down", () => {
    const stage = java("StageView.java");
    assert.ok(stage.includes("COLUMNS = 4") && stage.includes("ROWS = 3") && stage.includes("TableBoxes.group(now, waiting, COLUMNS * ROWS)"));
  });

  it("should keep every song of a table in its box and put the table that sings first first", () => {
    const boxes = java("TableBoxes.java");
    assert.ok(boxes.includes("if (now != null) add(byTable, now)") && boxes.includes("LinkedHashMap") && boxes.includes("tables.subList(0, maxTables)"));
  });

  it("should show a song's place in the whole queue so members see when their table's turn comes", () => {
    assert.ok(java("StageView.java").includes("song.position + \". \"") && java("QueueClient.java").includes('song.position = json.optInt("position")'));
  });

  it("should show the table boxes over a playing song now and then", () => {
    assert.ok(java("PlayerActivity.java").includes("stage.showBoard(board.now, board.queue)") && java("PlayerActivity.java").includes("BOARD_EVERY_MS = 90_000"));
  });

  it("should play a YouTube song with YouTube's own embedded player, never by taking the video apart", () => {
    const view = java("YouTubeView.java");
    assert.ok(view.includes("https://www.youtube.com/iframe_api") && java("PlayerActivity.java").includes('YOUTUBE_PREFIX = "yt:"'));
  });

  it("should skip a YouTube video that cannot be shown instead of waiting for ever", () => {
    assert.ok(java("YouTubeView.java").includes("START_TIMEOUT_MS") && java("PlayerActivity.java").includes("@Override public void onFailed()"));
  });

  it("should answer members' searches, singers and singer songs from the videos on the box", () => {
    const search = java("SongSearch.java");
    assert.ok(search.includes('"singers".equals(job.kind)') && search.includes('"singer".equals(job.kind)') && java("PlayerActivity.java").includes("client.jobs()"));
  });

  it("should follow the singer's voice choice made in the app", () => {
    assert.ok(java("PlayerActivity.java").includes('"original".equals(now.vocal)') && java("VoiceControl.java").includes("BridgeSettings.isVoiceFirst(context)"));
  });

  it("should switch the sound track of a video that has two, and the channel only when the box is set to channels", () => {
    const voice = java("VoiceControl.java");
    assert.ok(voice.includes("audio.size() >= 2") && voice.includes("BridgeSettings.isChannelVoice(context)"));
  });

  it("should not scan the storage on the screen's own thread", () => {
    assert.ok(java("SongFiles.java").includes("synchronized void refreshIfOld()") && !/all\(\)\s*\{\s*refreshIfOld/.test(java("SongFiles.java")));
  });

  it("should find a video by the song title inside the file name, ignoring spaces and punctuation", () => {
    assert.ok(java("SongFiles.java").includes("Character.isLetterOrDigit") && java("SongFiles.java").includes("song.key.contains(wantedTitle)"));
  });
});
