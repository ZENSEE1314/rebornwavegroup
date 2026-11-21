package group.rebornwave.tvoverlay;

import android.content.Context;

import java.util.List;

/**
 * Joins the app's song queue to the box's own player, from inside this app (so it can be seen working, unlike the old connector page): the song that is
 * on now in the app is ordered on the box (Add1 with its number) when the box is idle, the box finishing it moves the app's queue on, and a song the app
 * skipped is cut on the box. Staff and singer buttons of the app (pause, mute, volume, replay ...) are pressed on the box. One round every poll.
 */
final class BoxBridge {
    private static final long NOT_STARTED_MS = 180_000; // the box took the order but never showed the song (a cloud song is downloaded first): give up on it
    private static final long QUEUE_WAITING_MAX_MS = 240_000; // nobody is singing in the app, singers wait, and the box still holds a song: a whole song takes about this long, so a longer one is stuck and is cut
    private static final long OTHER_SONG_MAX_MS = 90_000; // the box holds a song that is not ours while ours waits: after this long it is cut
    private static final String ORIGINAL = "original";
    private static final int FIND_PAGES = 3;

    private final Context context;
    private final QueueClient client;
    private long busyWithOtherSince = 0; // since when the box has held a song that is not ours, while ours waits (0 = not waiting)
    private int orderedId = 0;       // the app's song that was ordered on the box and is not finished yet
    private long orderedAt = 0;
    private boolean seenBusy = false; // the box showed the ordered song as playing at least once
    private boolean boxVocalOriginal = false; // the box cannot tell us whether the singer's own voice is on: we remember what we last set
    private int voiceChosenAtBoxFor = 0;
    private volatile String problem = "";
    private volatile String lastEvent = "";
    private volatile String lastList = ""; // the titles the box's play list holds now
    private volatile int lastCount = -1; // songs the box's own play list held at the last look (-1 = not looked yet)

    BoxBridge(Context context, QueueClient client) {
        this.context = context.getApplicationContext();
        this.client = client;
    }

    /** What is wrong, in words, for the red line ("" when all is well). */
    String problem() {
        return problem;
    }

    /** One line for the touch screen: what was last done and how many songs the box holds, so a photo of the screen says why nothing plays. */
    String screenLine() {
        String event = lastEvent.isEmpty() ? "" : lastEvent + " · ";
        return "Box: " + event + "playlist " + (lastCount < 0 ? "?" : String.valueOf(lastCount)) + (lastList.isEmpty() ? "" : " [" + lastList + "]");
    }

    /** The last thing done on the box, for the test button. */
    String lastEvent() {
        return lastEvent;
    }

    /** One round: look at the box and at the app's queue, and move whichever is behind. */
    void tick(QueueClient.Board board) throws Exception {
        String box = BoxServlets.find(context);
        if (box.isEmpty()) {
            problem = Words.t("Cannot find the box's own song system on this network. Is its program running?",
                    "在网络上找不到点歌机自带的点歌系统。它的程序在运行吗？",
                    "Sistem lagu bawaan mesin tidak ditemukan di jaringan. Apakah programnya berjalan?");
            return;
        }
        problem = "";
        int count = BoxServlets.playlistCount(box);
        lastCount = count;
        lastList = count > 0 ? BoxServlets.playlistNames(box) : "";
        QueueClient.Song now = board.now;

        if (now == null) {
            if (orderedId != 0) { // the app has no song on now any more (cancelled): stop what the box plays
                cutOnBox(box);
                return;
            }
            if (board.queue.isEmpty() || board.paused) {
                busyWithOtherSince = 0;
            } else if (count == 0) { // nobody is singing: the next singer starts
                busyWithOtherSince = 0;
                client.next(0, false);
            } else {
                waitForOtherSong(box, QUEUE_WAITING_MAX_MS); // singers wait but the box holds a song (a stuck cloud download): without this the queue never starts
            }
            return;
        }
        if (orderedId != 0 && orderedId != now.id) { // the app moved on (skipped): cut the old song on the box
            cutOnBox(box);
            return;
        }
        if (orderedId == 0) {
            if (count > 0) {
                waitForOtherSong(box, OTHER_SONG_MAX_MS);
                return;
            }
            busyWithOtherSince = 0;
            order(box, now);
            return;
        }
        if (count > 0) {
            seenBusy = true;
            followVoice(box, now);
        } else if (seenBusy) {
            lastEvent = "finished: " + now.title;
            orderedId = 0;
            client.next(now.id, false); // the box finished it: the next singer
        } else if (System.currentTimeMillis() - orderedAt > NOT_STARTED_MS) {
            lastEvent = "never started: " + now.title;
            orderedId = 0;
            client.next(now.id, true);
        } else {
            String reason = CloudMarks.has(now.karaokeCode) ? "⬇ downloading on the box (cloud song, not downloaded yet) " : "waiting for the box to start ";
            lastEvent = reason + (System.currentTimeMillis() - orderedAt) / 1000 + " s: " + now.title;
        }
    }

    /**
     * The box's play list holds a song this app did not order (one ordered on the box itself, or one left stuck). Wait for it; if it is still there after
     * OTHER_SONG_MAX_MS the app's song would never start, so the box's Skip cuts it.
     */
    private void waitForOtherSong(String box, long maxMs) throws Exception {
        long nowMs = System.currentTimeMillis();
        if (busyWithOtherSince == 0) busyWithOtherSince = nowMs;
        long waited = nowMs - busyWithOtherSince;
        if (waited > maxMs) {
            BoxServlets.command(box, "Skip");
            busyWithOtherSince = 0;
            lastEvent = "cut a song that held the box";
        } else {
            lastEvent = "box busy with another song, waiting " + waited / 1000 + " s";
        }
    }

    private void order(String box, QueueClient.Song now) throws Exception {
        String code = now.karaokeCode.isEmpty() ? findCodeOnBox(box, now) : now.karaokeCode;
        if (code.isEmpty()) { // the box does not have this song: it cannot be played there
            lastEvent = "not on the box: " + now.title;
            client.next(now.id, true);
            return;
        }
        boolean wantOriginal = ORIGINAL.equals(now.vocal);
        if (voiceChosenAtBoxFor != now.id && wantOriginal != boxVocalOriginal) {
            BoxServlets.command(box, "MuOr");
            boxVocalOriginal = wantOriginal;
        }
        String answer = BoxServlets.command(box, "Add1", code);
        OverlayLog.add("box: Add1 " + code + " answered: " + (answer.length() > 160 ? answer.substring(0, 160) : answer));
        orderedId = now.id;
        orderedAt = System.currentTimeMillis();
        seenBusy = false;
        lastEvent = "ordered " + code + ": " + now.title;
        OverlayLog.add("box: " + lastEvent);
    }

    /** A song that came with no box number (a library song): look for the same title on the box, first on the whole title, a few pages deep. */
    private String findCodeOnBox(String box, QueueClient.Song now) throws Exception {
        String wanted = squash(now.title);
        for (int page = 1; page <= FIND_PAGES; page++) {
            BoxServlets.Page found = BoxServlets.search(box, now.title, "", page, false);
            for (SongPick song : found.songs) if (squash(song.title).equals(wanted)) return song.code;
            if (found.isLast()) break;
        }
        return "";
    }

    private static String squash(String text) {
        return text.toLowerCase(java.util.Locale.ROOT).replaceAll("[^\\p{L}\\p{N}]", "");
    }

    private void cutOnBox(String box) throws Exception {
        BoxServlets.command(box, "Skip");
        lastEvent = "skipped on the box";
        orderedId = 0;
    }

    /** The singer or staff switched the singer's voice in the app while the song plays: press the box's toggle once. */
    private void followVoice(String box, QueueClient.Song now) throws Exception {
        boolean wantOriginal = ORIGINAL.equals(now.vocal);
        if (voiceChosenAtBoxFor == now.id || wantOriginal == boxVocalOriginal) return;
        BoxServlets.command(box, "MuOr");
        boxVocalOriginal = wantOriginal;
    }

    /** The Analog button of the touch screen: the box's own voice toggle, remembered so the app's choice does not undo it for this song. */
    void toggleVoice(int nowId) throws Exception {
        String box = BoxServlets.find(context);
        if (box.isEmpty()) return;
        BoxServlets.command(box, "MuOr");
        boxVocalOriginal = !boxVocalOriginal;
        voiceChosenAtBoxFor = nowId;
    }

    /** What staff and singers pressed in the app since the last round ("Play", "Mute", "Music_up", "Reset", "Del1:12" ...): pressed on the box. */
    void pressButtons(List<String> commands, QueueClient.Board board) throws Exception {
        if (commands.isEmpty()) return;
        String box = BoxServlets.find(context);
        if (box.isEmpty()) return;
        for (String command : commands) {
            if ("Skip".equals(command)) {
                if (board.now != null) client.next(board.now.id, true); // the queue moves on; the next round cuts the song on the box
                else BoxServlets.command(box, "Skip");
            } else if ("MuOr".equals(command)) {
                if (board.now == null) BoxServlets.command(box, "MuOr"); // with a song on, the app's own voice setting follows it
            } else if (command.indexOf(':') > 0) {
                String[] parts = command.split(":", 2); // "Del1:12" = remove the box's song number 12
                BoxServlets.command(box, parts[0], parts[1]);
            } else {
                BoxServlets.command(box, command);
            }
        }
    }
}
