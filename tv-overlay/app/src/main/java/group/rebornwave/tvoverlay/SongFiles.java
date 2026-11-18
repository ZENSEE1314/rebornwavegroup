package group.rebornwave.tvoverlay;

import android.content.Context;
import android.os.Environment;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * The karaoke videos stored on this box: a folder called "Karaoke" in the box's storage or on a USB drive. A file name reads "Singer - Title.mp4"
 * (or just "Title.mp4"). Every video has a song number ("L" + a short code made from its path) that members' requests carry, and a song is also
 * found by its title (and singer) inside the file's name.
 */
final class SongFiles {
    /** One video of the box. */
    static final class LocalSong {
        File file;
        String code;
        String title;
        String artist;
        String key; // the whole name squashed, for matching
    }

    private static final String FOLDER = "Karaoke";
    private static final String[] VIDEO_ENDINGS = {".mp4", ".mkv", ".avi", ".mov", ".webm", ".mpg", ".mpeg", ".ts", ".flv", ".m4v"};
    private static final String SINGER_SEPARATOR = "\\s*[-–—]\\s*";
    private static final String CODE_PREFIX = "L";
    private static final long INDEX_MAX_AGE_MS = 60_000;
    private static final int MIN_TITLE_LENGTH = 2;
    private static final int SINGER_BONUS = 2;
    private static final int TITLE_SCORE = 10;
    private static final int MAX_DEPTH = 3;

    private final Context context;
    private volatile List<LocalSong> songs = new ArrayList<LocalSong>();
    private long indexedAt = 0;

    SongFiles(Context context) {
        this.context = context.getApplicationContext();
    }

    /** The folders searched, for showing the person where to put the videos. */
    String foldersText() {
        StringBuilder text = new StringBuilder();
        for (File folder : folders()) text.append(text.length() == 0 ? "" : "\n").append(folder.getAbsolutePath());
        return text.toString();
    }

    int count() {
        return all().size();
    }

    /** The videos found by the last scan; never scans itself, so it is safe on the screen's own thread (see refreshIfOld). */
    List<LocalSong> all() {
        return songs;
    }

    /** The video with this song number, or null. */
    LocalSong byCode(String code) {
        for (LocalSong song : all()) if (song.code.equals(code)) return song;
        return null;
    }

    /** The video whose name holds this title (and, better, this singer), or null when the box has none. */
    LocalSong find(String title, String artist) {
        String wantedTitle = squash(title);
        if (wantedTitle.length() < MIN_TITLE_LENGTH) return null;
        String wantedArtist = squash(artist);
        LocalSong best = null;
        int bestScore = 0;
        for (LocalSong song : all()) {
            if (!song.key.contains(wantedTitle)) continue;
            int score = TITLE_SCORE + (!wantedArtist.isEmpty() && song.key.contains(wantedArtist) ? SINGER_BONUS : 0) - song.key.length() / TITLE_SCORE;
            if (best == null || score > bestScore) {
                best = song;
                bestScore = score;
            }
        }
        return best;
    }

    /** Scans the folders again when the last scan is a minute old. Reads the storage: call it from a background thread only. */
    synchronized void refreshIfOld() {
        if (System.currentTimeMillis() - indexedAt < INDEX_MAX_AGE_MS) return;
        List<File> found = new ArrayList<File>();
        for (File folder : folders()) collect(folder, found, 0);
        List<LocalSong> indexed = new ArrayList<LocalSong>();
        for (File file : found) indexed.add(describe(file));
        songs = indexed;
        indexedAt = System.currentTimeMillis();
    }

    private static LocalSong describe(File file) {
        LocalSong song = new LocalSong();
        song.file = file;
        song.code = CODE_PREFIX + Integer.toHexString(file.getAbsolutePath().hashCode());
        String name = baseName(file);
        String[] parts = name.split(SINGER_SEPARATOR, 2);
        song.artist = parts.length == 2 ? parts[0].trim() : "";
        song.title = parts.length == 2 ? parts[1].trim() : name.trim();
        song.key = squash(name);
        return song;
    }

    private List<File> folders() {
        List<File> folders = new ArrayList<File>();
        File own = context.getExternalFilesDir(null);
        if (own != null) folders.add(new File(own, FOLDER));
        folders.add(new File(Environment.getExternalStorageDirectory(), FOLDER));
        File[] drives = new File("/storage").listFiles();
        if (drives != null) for (File drive : drives) folders.add(new File(drive, FOLDER));
        return folders;
    }

    private static void collect(File folder, List<File> found, int depth) {
        File[] entries = folder.listFiles();
        if (entries == null || depth > MAX_DEPTH) return;
        for (File entry : entries) {
            if (entry.isDirectory()) collect(entry, found, depth + 1);
            else if (isVideo(entry.getName())) found.add(entry);
        }
    }

    private static boolean isVideo(String name) {
        String lower = name.toLowerCase(Locale.ROOT);
        for (String ending : VIDEO_ENDINGS) if (lower.endsWith(ending)) return true;
        return false;
    }

    private static String baseName(File file) {
        String name = file.getName();
        int dot = name.lastIndexOf('.');
        return dot > 0 ? name.substring(0, dot) : name;
    }

    /** Lower case with only letters and digits (any language) left, so spaces, dashes and brackets never stop a match. */
    static String squash(String text) {
        StringBuilder squashed = new StringBuilder();
        String lower = text == null ? "" : text.toLowerCase(Locale.ROOT);
        for (int i = 0; i < lower.length(); i++) if (Character.isLetterOrDigit(lower.charAt(i))) squashed.append(lower.charAt(i));
        return squashed.toString();
    }
}
