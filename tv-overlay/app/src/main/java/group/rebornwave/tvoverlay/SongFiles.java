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
    private static final String BOX_SONGS_FOLDER = "songs"; // where the karaoke box's own program keeps its videos: songs/<first digits>/<song number>.mkv
    private static final String[] VIDEO_ENDINGS = {".mp4", ".mkv", ".avi", ".mov", ".webm", ".mpg", ".mpeg", ".ts", ".flv", ".m4v"};
    private static final String SINGER_SEPARATOR = "\\s*[-–—]\\s*";
    private static final String CODE_PREFIX = "L";
    private static final long INDEX_MAX_AGE_MS = 60_000;
    private static final int MIN_TITLE_LENGTH = 2;
    private static final int SINGER_BONUS = 2;
    private static final int TITLE_SCORE = 10;
    private static final int MAX_DEPTH = 3;
    private static final int SURVEY_DEPTH = 6;
    private static final int SURVEY_FOLDERS = 3;
    private static final int SURVEY_NOTES = 12;
    private static final int SURVEY_TAIL_BYTES = 400;
    private static final long SURVEY_MIN_BYTES = 5L * 1024 * 1024;

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
        String name = baseName(file);
        // The box's own videos are named by their song number (10156426.mkv): that number is the code its song list and the members' requests carry.
        song.code = name.matches("\\d+") ? name : CODE_PREFIX + Integer.toHexString(file.getAbsolutePath().hashCode());
        String[] parts = name.split(SINGER_SEPARATOR, 2);
        song.artist = parts.length == 2 ? parts[0].trim() : "";
        song.title = parts.length == 2 ? parts[1].trim() : name.trim();
        song.key = squash(name);
        return song;
    }

    /** The "Karaoke" folders of this box (its own storage, the app's folder, USB drives): where videos and the "Singers" photo folder may be. */
    List<File> roots() {
        return folders();
    }

    private List<File> folders() {
        List<File> folders = new ArrayList<File>();
        File own = context.getExternalFilesDir(null);
        if (own != null) folders.add(new File(own, FOLDER));
        folders.add(new File(Environment.getExternalStorageDirectory(), FOLDER));
        folders.add(new File(Environment.getExternalStorageDirectory(), BOX_SONGS_FOLDER));
        File[] drives = new File("/storage").listFiles();
        if (drives != null) {
            for (File drive : drives) {
                folders.add(new File(drive, FOLDER));
                folders.add(new File(drive, BOX_SONGS_FOLDER));
            }
        }
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

    /**
     * For the "Find the box's song files" button: walks the box's storage and USB drives and says which folders hold the most big files, what endings
     * those files have and a few names, so we can tell whether this app's own player can read what the box's program stores. Slow: background thread only.
     */
    String survey() {
        java.util.Map<String, Integer> endings = new java.util.TreeMap<String, Integer>();
        java.util.Map<String, Integer> folderCounts = new java.util.HashMap<String, Integer>();
        java.util.Map<String, String> samples = new java.util.HashMap<String, String>();
        int[] total = {0};
        List<File> starts = new ArrayList<File>();
        starts.add(Environment.getExternalStorageDirectory());
        File[] drives = new File("/storage").listFiles();
        if (drives != null) for (File drive : drives) starts.add(drive);
        for (File start : starts) surveyFolder(start, 0, endings, folderCounts, samples, total);
        StringBuilder report = new StringBuilder("Big files (over 5 MB): ").append(total[0]);
        report.append("\nEndings: ").append(endings);
        List<java.util.Map.Entry<String, Integer>> top = new ArrayList<java.util.Map.Entry<String, Integer>>(folderCounts.entrySet());
        java.util.Collections.sort(top, new java.util.Comparator<java.util.Map.Entry<String, Integer>>() {
            @Override public int compare(java.util.Map.Entry<String, Integer> a, java.util.Map.Entry<String, Integer> b) { return b.getValue() - a.getValue(); }
        });
        for (int i = 0; i < Math.min(SURVEY_FOLDERS, top.size()); i++) {
            String folder = top.get(i).getKey();
            report.append("\n").append(top.get(i).getValue()).append(" in ").append(folder).append("  e.g. ").append(samples.get(folder));
        }
        List<File> notes = new ArrayList<File>();
        for (File start : starts) collectNotes(start, 0, notes);
        for (File note : notes) {
            report.append("\n").append(note.getAbsolutePath()).append(" (").append(note.length() / 1024).append(" KB)");
            if (note.getName().endsWith(".log")) report.append(" ends: ").append(tail(note));
        }
        return report.toString();
    }

    /** The box program's own notes (.log, .txt): they may say where it fetches the songs it keeps in the cloud. */
    private static void collectNotes(File folder, int depth, List<File> notes) {
        File[] entries = folder.listFiles();
        if (entries == null || depth > SURVEY_DEPTH || notes.size() >= SURVEY_NOTES) return;
        for (File entry : entries) {
            String name = entry.getName().toLowerCase(Locale.ROOT);
            if (entry.isDirectory()) collectNotes(entry, depth + 1, notes);
            else if (entry.length() > SURVEY_MIN_BYTES && (name.endsWith(".log") || name.endsWith(".txt") || name.endsWith(".war") || name.endsWith(".exe"))) notes.add(entry);
        }
    }

    private static String tail(File file) {
        try {
            java.io.RandomAccessFile reader = new java.io.RandomAccessFile(file, "r");
            try {
                byte[] bytes = new byte[SURVEY_TAIL_BYTES];
                reader.seek(Math.max(0, reader.length() - bytes.length));
                int read = reader.read(bytes);
                return read <= 0 ? "" : new String(bytes, 0, read, "UTF-8").replace('\n', ' ').replace('\r', ' ');
            } finally {
                reader.close();
            }
        } catch (Exception unreadable) {
            return "(not readable)";
        }
    }

    private static void surveyFolder(File folder, int depth, java.util.Map<String, Integer> endings, java.util.Map<String, Integer> folderCounts,
                                     java.util.Map<String, String> samples, int[] total) {
        File[] entries = folder.listFiles();
        if (entries == null || depth > SURVEY_DEPTH) return;
        for (File entry : entries) {
            if (entry.isDirectory()) {
                surveyFolder(entry, depth + 1, endings, folderCounts, samples, total);
            } else if (entry.length() > SURVEY_MIN_BYTES) {
                String name = entry.getName();
                int dot = name.lastIndexOf('.');
                String ending = dot >= 0 ? name.substring(dot).toLowerCase(Locale.ROOT) : "(none)";
                Integer seen = endings.get(ending);
                endings.put(ending, seen == null ? 1 : seen + 1);
                String path = folder.getAbsolutePath();
                Integer inFolder = folderCounts.get(path);
                folderCounts.put(path, inFolder == null ? 1 : inFolder + 1);
                if (!samples.containsKey(path)) samples.put(path, name);
                total[0]++;
            }
        }
    }

    /** Lower case with only letters and digits (any language) left, so spaces, dashes and brackets never stop a match. */
    static String squash(String text) {
        StringBuilder squashed = new StringBuilder();
        String lower = text == null ? "" : text.toLowerCase(Locale.ROOT);
        for (int i = 0; i < lower.length(); i++) if (Character.isLetterOrDigit(lower.charAt(i))) squashed.append(lower.charAt(i));
        return squashed.toString();
    }
}
