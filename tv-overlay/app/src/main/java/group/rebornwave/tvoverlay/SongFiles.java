package group.rebornwave.tvoverlay;

import android.content.Context;
import android.os.Environment;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * The karaoke videos stored on this box: a folder called "Karaoke" in the box's storage or on a USB drive. A song is matched to a file by its title
 * (and singer) inside the file's name, so "Jay Chou - Qing Hua Ci.mp4" answers a request for "Qing Hua Ci".
 */
final class SongFiles {
    private static final String FOLDER = "Karaoke";
    private static final String[] VIDEO_ENDINGS = {".mp4", ".mkv", ".avi", ".mov", ".webm", ".mpg", ".mpeg", ".ts", ".flv", ".m4v"};
    private static final long INDEX_MAX_AGE_MS = 60_000;
    private static final int MIN_TITLE_LENGTH = 2;
    private static final int SINGER_BONUS = 2;
    private static final int TITLE_SCORE = 10;
    private static final int MAX_DEPTH = 3;

    private final Context context;
    private List<File> files = new ArrayList<File>();
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
        refreshIfOld();
        return files.size();
    }

    /** The file for this song, or null when the box has none. */
    File find(String title, String artist) {
        refreshIfOld();
        String wantedTitle = squash(title);
        if (wantedTitle.length() < MIN_TITLE_LENGTH) return null;
        String wantedArtist = squash(artist);
        File best = null;
        int bestScore = 0;
        for (File file : files) {
            String name = squash(baseName(file));
            if (!name.contains(wantedTitle)) continue;
            int score = TITLE_SCORE + (!wantedArtist.isEmpty() && name.contains(wantedArtist) ? SINGER_BONUS : 0) - name.length() / TITLE_SCORE;
            if (best == null || score > bestScore) {
                best = file;
                bestScore = score;
            }
        }
        return best;
    }

    private void refreshIfOld() {
        if (System.currentTimeMillis() - indexedAt < INDEX_MAX_AGE_MS) return;
        List<File> found = new ArrayList<File>();
        for (File folder : folders()) collect(folder, found, 0);
        files = found;
        indexedAt = System.currentTimeMillis();
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
