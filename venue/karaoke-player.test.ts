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

  it("should show the TV picture on the HDMI screen and the song pages on the box's own touch screen", () => {
    assert.ok(java("PlayerActivity.java").includes("new TvPresentation(this, external)") && java("TvPresentation.java").includes("extends Presentation"));
  });

  it("should fall back to one screen with a Songs button when the box has no second screen", () => {
    assert.ok(java("PlayerActivity.java").includes("menuButton") && java("PlayerActivity.java").includes("panel.setVisibility(View.GONE)"));
  });

  it("should list the tables the admin set, scrolling down for more, each box scrolling its own songs", () => {
    const panel = java("ControlPanel.java");
    assert.ok(panel.includes("ScrollView tablesScroll") && panel.includes("adminTables") && panel.includes("requestDisallowInterceptTouchEvent") && java("QueueClient.java").includes('"/api/karaoke/tables"'));
  });

  it("should offer the four ways to choose a song: singers, song title, top songs, new songs", () => {
    assert.ok(java("ControlPanel.java").includes("enum Way { SINGERS, TITLE, TOP, FRESH }"));
  });

  it("should put the control bar buttons under every page: mute, volume, tone, play, skip, replay, analog", () => {
    const panel = java("ControlPanel.java");
    for (const action of ["onMute", "onVolume(-1)", "onVolume(1)", "onTone(-1)", "onTone(1)", "onPlay", "onSkip", "onReplay", "onAnalog"]) assert.ok(panel.includes(action), action);
  });

  it("should split the song-title page in two halves under the search bar: the list left, a small keyboard right", () => {
    assert.ok(java("OnScreenKeyboard.java").includes('"QWERTYUIOP"') && java("ControlPanel.java").includes("head.addView(searchBox, new LinearLayout.LayoutParams(dp(SEARCH_WIDTH_DP)") && java("ControlPanel.java").includes("halves.addView(keyboardView, new LinearLayout.LayoutParams(0, LayoutParams.MATCH_PARENT, 1f))") && java("ControlPanel.java").includes("halves.addView(scroll, new LinearLayout.LayoutParams(0, LayoutParams.MATCH_PARENT, 1f))"));
  });

  it("should answer a tap on a table at once by changing only the two boxes whose look changes", () => {
    const panel = java("ControlPanel.java");
    assert.ok(panel.includes("highlight(previous);") && panel.includes("boxViews.put(table, box);") && !panel.includes("rebuildTablesNow") && panel.includes('String fresh = names + "|" + signatureOf(byTable);'));
  });

  it("should open a singer's songs from a tap on the face of one of their songs", () => {
    const panel = java("ControlPanel.java");
    assert.ok(panel.includes("face.setOnClickListener") && panel.includes("loadSingerSongs(faceOf,") && panel.includes("private static String firstSinger(String artist)"));
  });

  it("should filter every list by a typed word, and the song-title page search the box instead", () => {
    const panel = java("ControlPanel.java");
    assert.ok(panel.includes("serverSearch ? \"\" : SongFiles.squash(typed.toString())".replace("serverSearch", "serverSearchPage")) && panel.includes("SongFiles.squash(pick.title + \" \" + pick.artist).contains(wanted)") && panel.includes("setKeyboardShown(serverSearch)"));
  });

  it("should filter by song language: Chinese, English, Japanese and Korean, told by the letters of the title", () => {
    const panel = java("ControlPanel.java");
    for (const code of ["LANGUAGE_CHINESE", "LANGUAGE_ENGLISH", "LANGUAGE_JAPANESE", "LANGUAGE_KOREAN"]) assert.ok(panel.includes(`${code} = `), code);
    assert.ok(panel.includes("static String languageOf(String text)") && panel.includes("0x3040") && panel.includes("0xAC00") && panel.includes("0x4E00"));
  });

  it("should show a singer's picture from the club's Singers folder, a saved one, or Deezer when the name is the same", () => {
    const photos = java("SingerPhotos.java");
    assert.ok(photos.includes('SINGERS_FOLDER = "Singers"') && photos.includes("api.deezer.com/search/artist") && photos.includes('SongFiles.squash(artist.optString("name")).equals(key)'));
  });

  it("should give every song row a picture: the singer's photo, else the YouTube thumbnail, else a frame of the video", () => {
    const photos = java("SingerPhotos.java");
    assert.ok(photos.includes("void loadForSong(") && photos.includes("i.ytimg.com/vi/") && photos.includes("getFrameAtTime") && java("ControlPanel.java").includes("photos.loadForSong(pick, picture)"));
  });

  it("should change the key of a video with a pitch change and say it cannot on YouTube", () => {
    const player = java("PlayerActivity.java");
    assert.ok(player.includes("new PlaybackParameters(1f,") && player.includes("The key cannot be changed on a YouTube song"));
  });

  it("should let the box's own voice choice stand over the app's until the next song", () => {
    assert.ok(java("PlayerActivity.java").includes("voiceChosenAtBoxFor == now.id"));
  });

  it("should take a request made at the box into the queue for its table through the app", () => {
    const server = readFileSync(new URL("../server/rebornGame.ts", import.meta.url), "utf8");
    assert.ok(server.includes('app.post("/api/karaoke/request"') && server.includes('app.get("/api/karaoke/tables"') && server.includes('app.get("/api/karaoke/top-songs"') && java("QueueClient.java").includes('"/api/karaoke/request"'));
  });

  it("should link the TV screen and the song system with the one code typed for the TV", () => {
    const tvRoutes = readFileSync(new URL("../server/tvDisplay.ts", import.meta.url), "utf8");
    assert.ok(tvRoutes.includes("karaoke: await injected.karaokeLink(req)") && java("Link.java").includes('saveSongSystem(context, answer.optJSONObject("karaoke"))'));
  });

  it("should start the song-system connector after a TV code brought its key, unless the built-in player is used", () => {
    assert.ok(java("MainActivity.java").includes("BridgeSettings.isReady(this) && !BridgeSettings.isPlayerMode(this)) startConnector()"));
  });

  it("should show the table boxes at once, Table 1 to 12 when the admin set none, so there is always something to tap", () => {
    const panel = java("ControlPanel.java");
    assert.ok(panel.includes("update(new ArrayList<String>(), new QueueClient.Board())") && panel.includes("DEFAULT_TABLES = 12"));
  });

  it("should say on the touch screen what is wrong: not linked (with its own code) or the app cannot be reached", () => {
    const player = java("PlayerActivity.java");
    assert.ok(player.includes("private void startLinking()") && player.includes("Link.pollEverything(") && player.includes("Cannot reach the app (") && java("ControlPanel.java").includes("void setStatus(String text)"));
  });

  it("should let a box with the club's key link itself with no code, and refuse a wrong or missing key", () => {
    const tvRoutes = readFileSync(new URL("../server/tvDisplay.ts", import.meta.url), "utf8");
    assert.ok(tvRoutes.includes('app.post("/api/tv/enroll"') && tvRoutes.includes("timingSafeEqual(wanted, given)") && tvRoutes.includes("wanted.length > 0"));
    assert.ok(java("Enroll.java").includes('"x-box-key", BuildConfig.BOX_KEY'));
  });

  it("should link itself at boot, when the app opens and when the song-system key was changed", () => {
    assert.ok(java("BootReceiver.java").includes("Enroll.start(context") && java("MainActivity.java").includes("private void linkByItself()") && java("PlayerActivity.java").includes("Enroll.relink(PlayerActivity.this, afterEnroll)"));
  });

  it("should keep the box key out of the public app: only the private build step sets it", () => {
    const flow = readFileSync(new URL("../.github/workflows/tv-overlay-apk.yml", import.meta.url), "utf8");
    assert.ok(flow.includes("BOX_KEY: ${{ secrets.BOX_SETUP_KEY }}") && flow.includes("reborn-box-private.apk") && !/^\s{6}BOX_KEY:/m.test(flow.split("jobs:")[0] + flow.split("steps:")[0].split("jobs:")[1]));
  });

  it("should open the song system straight from the private app's icon, with the set-up page behind a gear button", () => {
    assert.ok(java("MainActivity.java").includes("Enroll.isAvailable() && !getIntent().getBooleanExtra(EXTRA_SETTINGS, false)") && java("PlayerActivity.java").includes("MainActivity.EXTRA_SETTINGS"));
  });

  it("should call the private app Reborn Karaoke so it is easy to tell from the overlay-only app", () => {
    assert.ok(app("AndroidManifest.xml").includes('android:label="${appLabel}"') && readFileSync(new URL("../tv-overlay/app/build.gradle", import.meta.url), "utf8").includes("'Reborn Karaoke'"));
  });

  it("should use the box's own song list and let the box's own program play, by default", () => {
    assert.ok(java("BridgeSettings.java").includes("getBoolean(KEY_BOX_PLAYBACK, true)") && java("PlayerActivity.java").includes("new BoxServletCatalog(this, client, photos)"));
  });

  it("should search the box's song system with its own web pages and leave out the songs kept in the cloud", () => {
    const servlets = java("BoxServlets.java");
    assert.ok(servlets.includes('"SearchServlet"') && servlets.includes('"SingerServlet"') && servlets.includes('"CommandServlet"') && servlets.includes('song.optInt("cLOUD") == 1'));
  });

  it("should read as many pages as needed because most of each page is cloud songs, stopping at the end of the list", () => {
    assert.ok(java("BoxServlets.java").includes("rawCount < SONGS_PER_PAGE") && java("BoxServletCatalog.java").includes("if (onPage.isLast()) break;"));
  });

  it("should find the box's song system on this device, the saved address or the network, and remember it", () => {
    const servlets = java("BoxServlets.java");
    assert.ok(servlets.includes('"http://127.0.0.1:" + PORT + "/" + PATH') && servlets.includes("private static String scan(") && servlets.includes("BridgeSettings.saveBox(context, address)"));
  });

  it("should keep the connector and the gift overlay running while the box's own program plays, and not take over the TV screen", () => {
    const player = java("PlayerActivity.java");
    assert.ok(player.includes("private void startBoxServices()") && player.includes("BridgeService.start(this)") && player.includes("tv = new TvLayer(this); // never shown"));
  });

  it("should send the control buttons to the box's own player while it plays", () => {
    const player = java("PlayerActivity.java");
    for (const button of ["Mute", "Music_up", "Music_down", "Tone_up", "Tone_down", "Play", "Reset", "MuOr"]) assert.ok(player.includes(`"${button}"`), button);
  });

  it("should let the set-up page choose who plays the songs and restart the player when it changes", () => {
    assert.ok(java("MainActivity.java").includes("saveBoxPlayback(MainActivity.this") && java("PlayerActivity.java").includes("boxMode != BridgeSettings.isBoxPlayback(this)"));
  });

  it("should have a test button that says where the box's song system was found and what its pages really answer", () => {
    assert.ok(java("BoxServlets.java").includes("static String diagnose(Context context)") && java("MainActivity.java").includes("BoxServlets.diagnose(MainActivity.this)"));
  });

  it("should say where the songs come from when a list is empty, so the wrong mode or a missing box is obvious", () => {
    assert.ok(java("ControlPanel.java").includes("catalog.source()") && java("BoxServletCatalog.java").includes("public String source()") && java("BoxCatalog.java").includes("public String source()"));
  });

  it("should read the box's singer list as the JSON text it arrives as, like its song list", () => {
    assert.ok(java("BoxServlets.java").includes('answer.opt("singerList")') && java("BoxServlets.java").includes("new JSONArray(String.valueOf(raw))"));
  });

  it("should leave out cloud songs by default but say so when that is why a list is empty, and let staff show them", () => {
    assert.ok(java("BridgeSettings.java").includes("getBoolean(KEY_SHOW_CLOUD, false)") && java("BoxServletCatalog.java").includes("cloud songs (kept in the cloud") && java("MainActivity.java").includes("saveShowCloud(MainActivity.this"));
  });

  it("should show on the touch screen when the connector that plays the requests is not running", () => {
    const player = java("PlayerActivity.java");
    assert.ok(player.includes("private String boxModeProblem()") && player.includes("!BridgeService.running") && java("MainActivity.java").includes("BridgeService.recentLines(8)"));
  });

  it("should not scan the storage on the screen's own thread", () => {
    assert.ok(java("SongFiles.java").includes("synchronized void refreshIfOld()") && !/all\(\)\s*\{\s*refreshIfOld/.test(java("SongFiles.java")));
  });

  it("should find a video by the song title inside the file name, ignoring spaces and punctuation", () => {
    assert.ok(java("SongFiles.java").includes("Character.isLetterOrDigit") && java("SongFiles.java").includes("song.key.contains(wantedTitle)"));
  });
});
