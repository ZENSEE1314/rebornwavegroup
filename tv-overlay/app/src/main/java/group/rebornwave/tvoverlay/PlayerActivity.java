package group.rebornwave.tvoverlay;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.hardware.display.DisplayManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Display;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.TextView;

import androidx.media3.common.MediaItem;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.PlaybackParameters;
import androidx.media3.common.Player;
import androidx.media3.common.Tracks;
import androidx.media3.exoplayer.ExoPlayer;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * The karaoke player of this box, used instead of the box's own song program. The TV (HDMI) screen shows the song (a video on this box, or a YouTube
 * karaoke video in YouTube's own embedded player), the table boxes, the "Now singing" card and the gifts; the box's own touch screen shows the
 * ControlPanel: the tables, the four ways to choose a song, and the Mute / Volume / Tone / Play / Skip / Replay / Analog buttons. With no second
 * screen the TV picture fills the screen and a "Songs" button opens the touch pages over it. The player tells the app when a song ended so the next
 * singer starts, and answers the song searches members make in the app.
 */
public class PlayerActivity extends Activity {
    private static final long POLL_MS = 2_000;
    private static final long TABLES_EVERY_MS = 30_000;
    private static final long JOB_RETRY_MS = 3_000;
    private static final long SKIP_DELAY_MS = 2_500;
    private static final float VOLUME_STEP = 0.1f;
    private static final int STORAGE_REQUEST = 7;
    private static final long BOARD_EVERY_MS = 90_000;
    private static final String YOUTUBE_PREFIX = "yt:";
    private static final int MENU_MARGIN_DP = 12;
    private static final int GEAR_LIFT_DP = 84; // above the control bar, at the left

    private final Handler ui = new Handler(Looper.getMainLooper());
    private QueueClient client;
    private SongFiles songFiles;
    private SongSearch songSearch;
    private SingerPhotos photos;
    private VoiceControl voice;
    private FrameLayout root;
    private ControlPanel panel;
    private TextView menuButton;
    private TextView settingsButton;
    private TvLayer tv;
    private TvPresentation presentation;
    private StageView stage;
    private GiftView gifts;
    private YouTubeView youtube;
    private TvFeed feed;
    private ExoPlayer player;
    private volatile boolean alive = false;
    private Thread poller;
    private Thread jobber;
    private Thread linker;
    private volatile List<String> tableLabels = new ArrayList<String>();
    private long tablesAt = 0;
    private int currentId = 0;
    private volatile boolean finishing = false;
    private boolean onYoutube = false;
    private boolean wantOriginal = false;
    private int voiceChosenAtBoxFor = 0; // the song whose singer's voice was switched on the touch screen: the app's own choice does not override it
    private int tone = 0;
    private boolean queuePaused = false;
    private boolean userPaused = false;
    private long lastBoardAt = 0;
    private boolean muted = false;
    private float volume = 1f;

    private final ControlPanel.Actions buttons = new ControlPanel.Actions() {
        @Override public void onMute() { muted = !muted; applyVolume(); showButtonState(); }

        @Override public void onVolume(int direction) {
            volume = Math.max(0f, Math.min(1f, volume + direction * VOLUME_STEP));
            muted = false;
            applyVolume();
            showButtonState();
        }

        @Override public void onTone(int direction) { changeTone(direction); }

        @Override public void onPlay() { userPaused = !userPaused; applyPlayState(); showButtonState(); }

        @Override public void onSkip() { finishSong(true); }

        @Override public void onReplay() { replay(); }

        @Override public void onAnalog() { switchVoiceAtBox(); }

        @Override public String onRequest(String table, SongPick pick) throws Exception {
            int place = client.request(table, pick);
            return Words.t("Added \"" + pick.title + "\" for Table " + table + (place > 0 ? " — place " + place : ""),
                    "已为 " + table + " 桌点歌：" + pick.title + (place > 0 ? "（第 " + place + " 位）" : ""),
                    "Ditambahkan \"" + pick.title + "\" untuk Meja " + table + (place > 0 ? " — urutan " + place : ""));
        }
    };

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        client = new QueueClient(this);
        songFiles = new SongFiles(this);
        songSearch = new SongSearch(songFiles);
        photos = new SingerPhotos(this, songFiles);
        voice = new VoiceControl(this);

        root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);
        setContentView(root);
        panel = new ControlPanel(this, new BoxCatalog(songFiles, client), buttons, photos);
        settingsButton = new TextView(this);
        settingsButton.setText("⚙");
        settingsButton.setTextSize(22);
        settingsButton.setTextColor(Color.WHITE);
        settingsButton.setBackgroundColor(Color.parseColor("#66000000"));
        settingsButton.setPadding(24, 8, 24, 8);
        settingsButton.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View view) { startActivity(new android.content.Intent(PlayerActivity.this, MainActivity.class).putExtra(MainActivity.EXTRA_SETTINGS, true)); }
        });
        menuButton = new TextView(this);
        menuButton.setText("🎤 " + Words.t("Songs", "点歌", "Lagu"));
        menuButton.setTextSize(20);
        menuButton.setTextColor(Color.parseColor("#1b1130"));
        menuButton.setBackgroundColor(Color.parseColor("#fcd34d"));
        menuButton.setPadding(32, 16, 32, 16);
        menuButton.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View view) { panel.setVisibility(panel.getVisibility() == View.VISIBLE ? View.GONE : View.VISIBLE); }
        });

        player = new ExoPlayer.Builder(this, voice.renderers()).build();
        player.addListener(new Player.Listener() {
            @Override public void onPlaybackStateChanged(int playbackState) {
                if (playbackState == Player.STATE_ENDED && !onYoutube) finishSong(false);
            }

            @Override public void onTracksChanged(Tracks tracks) {
                voice.apply(player, wantOriginal);
            }

            @Override public void onPlayerError(PlaybackException error) {
                if (onYoutube) return;
                stage.flash(Words.t("This video cannot be played — skipping", "无法播放此视频，已跳过", "Video tidak bisa diputar — dilewati"));
                finishSong(true);
            }
        });
        askForStorage();
    }

    @Override
    protected void onStart() {
        super.onStart();
        BridgeSettings.savePlayerMode(this, true);
        BridgeService.stop(this);
        hideSystemBars();
        attachScreens();
        startGifts();
        alive = true;
        showSetupHintIfNeeded();
        showButtonState();
        if (BridgeSettings.isReady(this)) {
            startPolling();
            startJobs();
        } else if (Enroll.isAvailable()) {
            panel.setStatus(Words.t("Connecting this box to the app…", "正在把本机连接到应用…", "Menghubungkan perangkat ini ke aplikasi…"));
        } else {
            startLinking();
        }
        Enroll.start(this, afterEnroll);
    }

    /** The box linked itself (first start, or the song-system key was changed): carry on as if it had been linked with a code. */
    private final Enroll.Done afterEnroll = new Enroll.Done() {
        @Override public void onLinked() {
            ui.post(new Runnable() {
                @Override public void run() {
                    panel.setStatus("");
                    startGifts();
                    startPolling();
                    startJobs();
                }
            });
        }
    };

    /** Not linked yet: the touch screen shows a code; the admin types it in Admin > Lights & TV > TV (or Requests > Karaoke system) and the box links itself. */
    private void startLinking() {
        if (linker != null && linker.isAlive()) return;
        linker = new Thread(new Runnable() {
            @Override public void run() {
                String code = "";
                while (alive && !BridgeSettings.isReady(PlayerActivity.this)) {
                    try {
                        if (code.isEmpty()) {
                            code = Link.newCode(PlayerActivity.this);
                            final String shown = code.substring(0, 3) + " " + code.substring(3);
                            showStatus(Words.t("Not linked to the app yet. Staff: type this code in Admin > Lights & TV > TV > Link a TV by code: ",
                                    "尚未链接到应用。请员工在 管理 > 灯光与电视 > 电视 > 用代码链接电视 输入此代码：",
                                    "Belum terhubung ke aplikasi. Staf: ketik kode ini di Admin > Lampu & TV > TV > Hubungkan TV dengan kode: ") + shown);
                        }
                        String answer = Link.pollEverything(PlayerActivity.this, code);
                        if ("expired".equals(answer)) code = "";
                        if ("linked".equals(answer) && BridgeSettings.isReady(PlayerActivity.this)) break;
                        if ("linked".equals(answer)) {
                            showStatus(Words.t("The code linked the TV only, not the song system. Use the song-system link in Admin > Requests > Karaoke system.",
                                    "该代码只链接了电视，未链接点歌系统。请在 管理 > 点歌 > 点歌系统 中链接。",
                                    "Kode hanya menghubungkan TV, bukan sistem lagu. Hubungkan di Admin > Permintaan > Sistem karaoke."));
                            code = "";
                        }
                    } catch (Exception failure) {
                        showStatus(Words.t("Cannot reach the app: check this box's internet", "无法连接应用：请检查本机网络", "Tidak bisa terhubung ke aplikasi: periksa internet"));
                        OverlayLog.add("player link: " + failure.getClass().getSimpleName() + " " + failure.getMessage());
                    }
                    try { Thread.sleep(POLL_MS); } catch (InterruptedException stopped) { return; }
                }
                if (!alive) return;
                ui.post(new Runnable() {
                    @Override public void run() {
                        panel.setStatus("");
                        startGifts();
                        startPolling();
                        startJobs();
                    }
                });
            }
        }, "player-link");
        linker.start();
    }

    private void showStatus(final String text) {
        ui.post(new Runnable() {
            @Override public void run() { panel.setStatus(text); }
        });
    }

    @Override
    protected void onStop() {
        alive = false;
        if (poller != null) poller.interrupt();
        if (jobber != null) jobber.interrupt();
        if (linker != null) linker.interrupt();
        if (feed != null) feed.stop();
        player.setPlayWhenReady(false);
        if (onYoutube) youtube.setPaused(true);
        if (presentation != null) {
            presentation.dismiss();
            presentation = null;
        }
        super.onStop();
    }

    @Override
    protected void onDestroy() {
        stage.close();
        youtube.stop();
        player.release();
        photos.close();
        super.onDestroy();
    }

    private void hideSystemBars() {
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
    }

    private void askForStorage() {
        boolean needsAsk = Build.VERSION.SDK_INT >= 23 && Build.VERSION.SDK_INT < 33 && checkSelfPermission(Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED;
        if (needsAsk) requestPermissions(new String[]{Manifest.permission.READ_EXTERNAL_STORAGE}, STORAGE_REQUEST);
    }

    /** With a second (HDMI) screen the TV picture goes there and the touch pages fill this screen; with one screen the picture fills it and "Songs" opens the pages. */
    private void attachScreens() {
        Display external = externalDisplay();
        if (presentation != null) presentation.dismiss();
        presentation = null;
        root.removeAllViews();
        if (external != null) {
            presentation = new TvPresentation(this, external);
            tv = presentation.layer;
            presentation.show();
            root.addView(panel, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
            panel.setVisibility(View.VISIBLE);
        } else {
            tv = new TvLayer(this);
            root.addView(tv, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
            root.addView(panel, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
            panel.setVisibility(View.GONE);
            FrameLayout.LayoutParams menuParams = new FrameLayout.LayoutParams(FrameLayout.LayoutParams.WRAP_CONTENT, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.TOP | Gravity.END);
            int margin = Math.round(MENU_MARGIN_DP * getResources().getDisplayMetrics().density);
            menuParams.setMargins(margin, margin, margin, margin);
            root.addView(menuButton, menuParams);
        }
        FrameLayout.LayoutParams gearParams = new FrameLayout.LayoutParams(FrameLayout.LayoutParams.WRAP_CONTENT, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM | Gravity.START);
        gearParams.setMargins(0, 0, 0, Math.round(GEAR_LIFT_DP * getResources().getDisplayMetrics().density));
        root.addView(settingsButton, gearParams);
        stage = tv.stage;
        gifts = tv.gifts;
        youtube = tv.youtube;
        player.setVideoSurfaceView(tv.video);
    }

    private Display externalDisplay() {
        for (Display display : ((DisplayManager) getSystemService(DISPLAY_SERVICE)).getDisplays()) {
            if (display.getDisplayId() != Display.DEFAULT_DISPLAY) return display;
        }
        return null;
    }

    /** Gifts come from the linked TV screen; when the overlay already draws them over everything, drawing them here too would show every gift twice. */
    private void startGifts() {
        boolean overlayDraws = OverlayService.running || OverlayAccessibilityService.windowsNow != null;
        if (feed != null) feed.stop();
        if (overlayDraws || !Link.isLinked(this)) return;
        feed = new TvFeed(this, ui, new TvFeed.Listener() {
            @Override public void onGift(TvFeed.Gift gift) { gifts.play(gift); }

            @Override public void onBar(String text) { }
        });
        feed.start(Link.path(this));
    }

    private void showSetupHintIfNeeded() {
        if (BridgeSettings.isReady(this)) return;
        stage.showLobby(Words.t("Link this box to the app first: open the app's settings screen and link the song system with a code.",
                "请先把本机链接到应用：打开应用设置界面，用代码链接点歌系统。",
                "Hubungkan perangkat ini ke aplikasi dulu: buka layar pengaturan dan hubungkan sistem lagu dengan kode."), null, new ArrayList<QueueClient.Song>());
    }

    private void startPolling() {
        if (poller != null && poller.isAlive()) return;
        poller = new Thread(new Runnable() {
            @Override public void run() {
                while (alive) {
                    try {
                        songFiles.refreshIfOld();
                        refreshTables();
                        pollOnce();
                        showStatus("");
                    } catch (Exception failure) {
                        OverlayLog.add("player: " + failure.getClass().getSimpleName() + " " + failure.getMessage());
                        if (String.valueOf(failure.getMessage()).contains("401")) Enroll.relink(PlayerActivity.this, afterEnroll); // the song-system key was changed
                        showStatus(Words.t("Cannot reach the app (" + failure.getMessage() + "). Check this box's internet and its link.",
                                "无法连接应用（" + failure.getMessage() + "）。请检查本机网络和链接。",
                                "Tidak bisa terhubung ke aplikasi (" + failure.getMessage() + "). Periksa internet dan tautan."));
                    }
                    try { Thread.sleep(POLL_MS); } catch (InterruptedException stopped) { return; }
                }
            }
        }, "player-poll");
        poller.start();
    }

    /** The tables the admin set up, asked again every half minute. */
    private void refreshTables() {
        long now = System.currentTimeMillis();
        if (now - tablesAt < TABLES_EVERY_MS) return;
        tablesAt = now;
        try {
            tableLabels = client.tables();
        } catch (Exception failure) {
            OverlayLog.add("player: tables not read: " + failure.getMessage());
        }
    }

    /** Answers the searches members make in the app: the app holds each call open until a question arrives. */
    private void startJobs() {
        if (jobber != null && jobber.isAlive()) return;
        jobber = new Thread(new Runnable() {
            @Override public void run() {
                while (alive) {
                    try {
                        for (QueueClient.Job job : client.jobs()) {
                            JSONObject answer = songSearch.answer(job);
                            client.answer(job.id, answer);
                        }
                    } catch (Exception failure) {
                        OverlayLog.add("player search: " + failure.getClass().getSimpleName() + " " + failure.getMessage());
                        try { Thread.sleep(JOB_RETRY_MS); } catch (InterruptedException stopped) { return; }
                    }
                }
            }
        }, "player-jobs");
        jobber.start();
    }

    private void pollOnce() throws Exception {
        QueueClient.Board board = client.board();
        boolean idleWithWaiting = board.now == null && !board.queue.isEmpty() && !board.paused;
        if (idleWithWaiting) {
            client.next(0, false);
            board = client.board();
        }
        final List<String> pressed = client.controls();
        final QueueClient.Board shown = board;
        ui.post(new Runnable() {
            @Override public void run() {
                for (String command : pressed) handleButton(command);
                onBoard(shown);
            }
        });
    }

    private void onBoard(QueueClient.Board board) {
        panel.update(tableLabels, board);
        QueueClient.Song next = board.queue.isEmpty() ? null : board.queue.get(0);
        if (board.now == null) {
            if (currentId != 0) stopPlaying();
            finishing = false;
            stage.showLobby(lobbyHint(board), null, board.queue);
            showButtonState();
            return;
        }
        if (board.now.id != currentId) {
            startSong(board.now, next);
        } else {
            stage.setNext(next);
            followVoice(board.now);
        }
        showBoardNowAndThen(board);
        if (board.paused != queuePaused) {
            queuePaused = board.paused;
            applyPlayState();
        }
        showButtonState();
    }

    private void stopPlaying() {
        player.stop();
        youtube.stop();
        onYoutube = false;
        currentId = 0;
    }

    /** The singer (or staff) switched the singer's voice in the app: the song on now follows, unless it was switched at the box's own screen. */
    private void followVoice(QueueClient.Song now) {
        boolean original = "original".equals(now.vocal);
        if (original == wantOriginal || voiceChosenAtBoxFor == now.id) return;
        wantOriginal = original;
        if (!onYoutube) voice.apply(player, wantOriginal);
    }

    /** The 12 table boxes over the playing song, once in a while. */
    private void showBoardNowAndThen(QueueClient.Board board) {
        long now = System.currentTimeMillis();
        if (now - lastBoardAt < BOARD_EVERY_MS) return;
        lastBoardAt = now;
        stage.showBoard(board.now, board.queue);
    }

    private String lobbyHint(QueueClient.Board board) {
        String pick = Words.t("Pick a song on the touch screen, or scan your table's QR code in the Reborn app", "请在触摸屏上点歌，或用 Reborn 应用扫描桌上的二维码", "Pilih lagu di layar sentuh, atau pindai QR meja di aplikasi Reborn");
        if (board.paused) return pick + "\n⏸ " + Words.t("The queue is paused", "队列已暂停", "Antrean dijeda");
        if (songFiles.count() == 0) return pick + "\n" + Words.t("No videos on this box yet. Put them in: ", "本机还没有视频。请放到：", "Belum ada video di perangkat ini. Taruh di: ") + songFiles.foldersText().split("\n")[0];
        return pick;
    }

    private void startSong(QueueClient.Song song, QueueClient.Song next) {
        currentId = song.id;
        finishing = false;
        userPaused = false;
        wantOriginal = "original".equals(song.vocal);
        voiceChosenAtBoxFor = 0;
        tone = 0;
        player.setPlaybackParameters(PlaybackParameters.DEFAULT);
        player.stop();
        youtube.stop();
        onYoutube = false;
        if (song.karaokeCode.startsWith(YOUTUBE_PREFIX) && YouTubeView.isVideoId(song.karaokeCode.substring(YOUTUBE_PREFIX.length()))) {
            startYoutube(song, next, song.karaokeCode.substring(YOUTUBE_PREFIX.length()));
            return;
        }
        SongFiles.LocalSong local = song.karaokeCode.isEmpty() ? null : songFiles.byCode(song.karaokeCode);
        if (local == null) local = songFiles.find(song.title, song.artist);
        if (local == null) {
            skipSoon(Words.t("No video for \"" + song.title + "\" on this box — skipping", "本机没有“" + song.title + "”的视频，已跳过", "Tidak ada video \"" + song.title + "\" di perangkat ini — dilewati"));
            return;
        }
        stage.showPlaying(song, next);
        player.setMediaItem(MediaItem.fromUri(Uri.fromFile(local.file)));
        player.prepare();
        applyPlayState();
    }

    private void startYoutube(QueueClient.Song song, QueueClient.Song next, String videoId) {
        onYoutube = true;
        stage.showPlaying(song, next);
        youtube.play(videoId, new YouTubeView.Listener() {
            @Override public void onEnded() { finishSong(false); }

            @Override public void onFailed() {
                stage.flash(Words.t("This YouTube video cannot be shown here — skipping", "此 YouTube 视频无法在本机播放，已跳过", "Video YouTube ini tidak bisa diputar di sini — dilewati"));
                finishSong(true);
            }
        });
        youtube.setVolume(muted ? 0 : Math.round(volume * 100));
    }

    private void skipSoon(String message) {
        stage.flash(message);
        ui.postDelayed(new Runnable() {
            @Override public void run() { finishSong(true); }
        }, SKIP_DELAY_MS);
    }

    /** Tells the app the song on now ended (or was skipped); it starts the next singer, which the next poll picks up. */
    private void finishSong(final boolean skip) {
        if (finishing || currentId == 0) return;
        finishing = true;
        final int finished = currentId;
        new Thread(new Runnable() {
            @Override public void run() {
                try {
                    client.next(finished, skip);
                } catch (Exception failure) {
                    OverlayLog.add("player: could not finish the song: " + failure.getMessage());
                    finishing = false;
                }
            }
        }, "player-next").start();
    }

    private void applyPlayState() {
        boolean play = !queuePaused && !userPaused;
        if (onYoutube) youtube.setPaused(!play);
        else player.setPlayWhenReady(play);
    }

    private void applyVolume() {
        float level = muted ? 0f : volume;
        player.setVolume(level);
        if (onYoutube) youtube.setVolume(Math.round(level * 100));
    }

    private void replay() {
        if (onYoutube) youtube.restart();
        else player.seekTo(0);
    }

    /** Key change in semitones (a video of the box only; YouTube's player cannot change the key). */
    private void changeTone(int direction) {
        if (onYoutube) {
            panel.flash(Words.t("The key cannot be changed on a YouTube song", "YouTube 歌曲不能改调", "Kunci lagu YouTube tidak bisa diubah"));
            return;
        }
        tone = Math.max(-ControlPanel.maxTone(), Math.min(ControlPanel.maxTone(), tone + direction));
        player.setPlaybackParameters(new PlaybackParameters(1f, (float) Math.pow(2.0, tone / 12.0)));
        showButtonState();
    }

    /** The Analog button: the singer's own voice on / off for the song on now, chosen at the box (it stays until the next song). */
    private void switchVoiceAtBox() {
        if (currentId == 0) return;
        if (onYoutube) {
            panel.flash(Words.t("The singer's voice cannot be switched on a YouTube song", "YouTube 歌曲不能切换原唱", "Suara penyanyi tidak bisa diganti pada lagu YouTube"));
            return;
        }
        wantOriginal = !wantOriginal;
        voiceChosenAtBoxFor = currentId;
        voice.apply(player, wantOriginal);
        showButtonState();
    }

    private void showButtonState() {
        panel.showState(muted, userPaused || queuePaused, wantOriginal, tone);
    }

    /** The buttons staff and singers press in the app: the same names the box's own phone page uses. */
    private void handleButton(String command) {
        if ("Play".equals(command)) {
            userPaused = !userPaused;
            applyPlayState();
        } else if ("Mute".equals(command)) {
            muted = !muted;
            applyVolume();
        } else if ("Music_up".equals(command) || "Music_down".equals(command)) {
            volume = Math.max(0f, Math.min(1f, volume + ("Music_up".equals(command) ? VOLUME_STEP : -VOLUME_STEP)));
            applyVolume();
        } else if ("Reset".equals(command)) {
            replay();
        } else if ("Skip".equals(command)) {
            finishSong(true);
        }
    }
}
