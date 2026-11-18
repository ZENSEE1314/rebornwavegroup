package group.rebornwave.tvoverlay;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.SurfaceView;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;

import androidx.media3.common.MediaItem;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.common.Tracks;
import androidx.media3.exoplayer.ExoPlayer;

import org.json.JSONObject;

import java.util.List;

/**
 * The karaoke player of this box, used instead of the box's own song program: it plays the song that is on now in the app's queue (a video on this
 * box, or a YouTube karaoke video shown with YouTube's own embedded player), tells the app when it ended so the next singer starts, answers the song
 * searches members make in the app, follows the pause / mute / volume / skip / repeat buttons and the singer's voice choice, and draws the table
 * boxes, "Now singing" card and gifts around the picture.
 */
public class PlayerActivity extends Activity {
    private static final long POLL_MS = 2_000;
    private static final long JOB_RETRY_MS = 3_000;
    private static final long SKIP_DELAY_MS = 2_500;
    private static final float VOLUME_STEP = 0.1f;
    private static final int STORAGE_REQUEST = 7;
    private static final long BOARD_EVERY_MS = 90_000;
    private static final String YOUTUBE_PREFIX = "yt:";

    private final Handler ui = new Handler(Looper.getMainLooper());
    private QueueClient client;
    private SongFiles songFiles;
    private SongSearch songSearch;
    private VoiceControl voice;
    private StageView stage;
    private GiftView gifts;
    private YouTubeView youtube;
    private TvFeed feed;
    private ExoPlayer player;
    private volatile boolean alive = false;
    private Thread poller;
    private Thread jobber;
    private int currentId = 0;
    private volatile boolean finishing = false;
    private boolean onYoutube = false;
    private boolean wantOriginal = false;
    private boolean queuePaused = false;
    private boolean userPaused = false;
    private long lastBoardAt = 0;
    private boolean muted = false;
    private float volume = 1f;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        client = new QueueClient(this);
        songFiles = new SongFiles(this);
        songSearch = new SongSearch(songFiles);
        voice = new VoiceControl(this);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(0xFF000000);
        SurfaceView video = new SurfaceView(this);
        root.addView(video, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        youtube = new YouTubeView(this);
        root.addView(youtube, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        stage = new StageView(this);
        root.addView(stage, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        gifts = new GiftView(this);
        root.addView(gifts, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(root);

        player = new ExoPlayer.Builder(this, voice.renderers()).build();
        player.setVideoSurfaceView(video);
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
        startGifts();
        alive = true;
        showSetupHintIfNeeded();
        if (BridgeSettings.isReady(this)) {
            startPolling();
            startJobs();
        }
    }

    @Override
    protected void onStop() {
        alive = false;
        if (poller != null) poller.interrupt();
        if (jobber != null) jobber.interrupt();
        if (feed != null) feed.stop();
        player.setPlayWhenReady(false);
        if (onYoutube) youtube.setPaused(true);
        super.onStop();
    }

    @Override
    protected void onDestroy() {
        stage.close();
        youtube.stop();
        player.release();
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

    /** Gifts come from the linked TV screen; when the overlay already draws them over everything, drawing them here too would show every gift twice. */
    private void startGifts() {
        boolean overlayDraws = OverlayService.running || OverlayAccessibilityService.windowsNow != null;
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
                "Hubungkan perangkat ini ke aplikasi dulu: buka layar pengaturan dan hubungkan sistem lagu dengan kode."), null, new java.util.ArrayList<QueueClient.Song>());
    }

    private void startPolling() {
        if (poller != null && poller.isAlive()) return;
        poller = new Thread(new Runnable() {
            @Override public void run() {
                while (alive) {
                    try {
                        songFiles.refreshIfOld();
                        pollOnce();
                    } catch (Exception failure) {
                        OverlayLog.add("player: " + failure.getClass().getSimpleName() + " " + failure.getMessage());
                    }
                    try { Thread.sleep(POLL_MS); } catch (InterruptedException stopped) { return; }
                }
            }
        }, "player-poll");
        poller.start();
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
        QueueClient.Song next = board.queue.isEmpty() ? null : board.queue.get(0);
        if (board.now == null) {
            if (currentId != 0) stopPlaying();
            finishing = false;
            stage.showLobby(lobbyHint(board), null, board.queue);
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
    }

    private void stopPlaying() {
        player.stop();
        youtube.stop();
        onYoutube = false;
        currentId = 0;
    }

    /** The singer (or staff) switched the singer's voice in the app: the song on now follows. */
    private void followVoice(QueueClient.Song now) {
        boolean original = "original".equals(now.vocal);
        if (original == wantOriginal) return;
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
        String pick = Words.t("Open the Reborn app, scan your table's QR code and pick a song", "打开 Reborn 应用，扫描桌上的二维码点歌", "Buka aplikasi Reborn, pindai QR meja Anda dan pilih lagu");
        if (board.paused) return pick + "\n⏸ " + Words.t("The queue is paused", "队列已暂停", "Antrean dijeda");
        if (songFiles.count() == 0) return pick + "\n" + Words.t("No videos on this box yet. Put them in: ", "本机还没有视频。请放到：", "Belum ada video di perangkat ini. Taruh di: ") + songFiles.foldersText().split("\n")[0];
        return pick;
    }

    private void startSong(QueueClient.Song song, QueueClient.Song next) {
        currentId = song.id;
        finishing = false;
        userPaused = false;
        wantOriginal = "original".equals(song.vocal);
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
            if (onYoutube) youtube.restart();
            else player.seekTo(0);
        } else if ("Skip".equals(command)) {
            finishSong(true);
        }
    }
}
