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
    assert.ok(java("PlayerActivity.java").includes("Player.STATE_ENDED) finishSong(false)") && java("QueueClient.java").includes('"/api/karaoke/next"'));
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

  it("should find a video by the song title inside the file name, ignoring spaces and punctuation", () => {
    assert.ok(java("SongFiles.java").includes("Character.isLetterOrDigit") && java("SongFiles.java").includes("name.contains(wantedTitle)"));
  });
});
