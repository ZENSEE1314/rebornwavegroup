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
    private static final String PROBE_TITLE = "新不了情";
    private static final int PEEK_HEAD_LINES = 4;
    private static final int PEEK_LINE_LENGTH = 200;
    private static final int SURVEY_TAIL_BYTES = 400;
    private static final long SURVEY_MIN_BYTES = 5L * 1024 * 1024;

    private static final String BOX_LIST_PATH = "KTV_VOD/weixin/SongSingerTxt/Songs.txt";
    private static final String LIST_SEPARATOR = "||";
    private static final int LIST_TITLE_FIELD = 1;
    private static final int LIST_SINGER_FIELD = 3;

    private volatile String[] indexKeys = new String[0]; // the whole box list: one short search key per song ...
    private volatile String[] indexRows = new String[0]; // ... and its "number<TAB>title<TAB>singer"
    private volatile java.util.Set<String> videoCodes = new java.util.HashSet<String>();
    private volatile boolean refreshing = false;
    private volatile String listProblem = ""; // why the list could not be read, for the screen
    private volatile long indexedListSize = -1; // size of the list file the index was built from

    private final Context context;
    private final java.util.Map<String, String[]> listed = new java.util.HashMap<String, String[]>(); // song number -> {title, singer, pinyin}
    private int listedFor = -1; // how many numbered videos the list was last read for
    private String[] listedFrom = null; // the in-memory list those names were taken from
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
        ensureListIndex(); // the box's list first: it makes search work while the (slow) scan of the video folders is still going
        if (System.currentTimeMillis() - indexedAt < INDEX_MAX_AGE_MS) return;
        List<File> found = new ArrayList<File>();
        for (File folder : folders()) collect(folder, found, 0);
        List<LocalSong> indexed = new ArrayList<LocalSong>();
        for (File file : found) indexed.add(describe(file));
        nameFromBoxList(indexed);
        java.util.Set<String> codes = new java.util.HashSet<String>();
        for (LocalSong song : indexed) codes.add(song.code);
        videoCodes = codes;
        songs = indexed;
        indexedAt = System.currentTimeMillis();
    }

    /**
     * The box's videos are named by number only; their titles, singers and pinyin are in the box's own list (Songs.txt, one song a line:
     * number||title||..||singer||..||number.mkv||pinyin initials||..||full pinyin). The list holds ~200,000 songs of which only the ones with a
     * video here are kept, and it is read again only when the number of videos changes.
     */
    private void nameFromBoxList(List<LocalSong> indexed) {
        java.util.Set<String> wanted = new java.util.HashSet<String>();
        for (LocalSong song : indexed) if (isDigits(song.code)) wanted.add(song.code);
        ensureListIndex();
        String[] rows = indexRows;
        if (wanted.size() != listedFor || rows != listedFrom) { // the names of this box's videos come from the one in-memory copy of the list
            listedFor = wanted.size();
            listedFrom = rows;
            listed.clear();
            String[] keys = indexKeys;
            for (int i = 0; i < rows.length; i++) {
                int tab = rows[i].indexOf('\t');
                String code = rows[i].substring(0, tab);
                if (!wanted.contains(code) || listed.containsKey(code)) continue;
                String[] parts = rows[i].split("\t", 3);
                listed.put(code, new String[] {parts[1], parts[2], keys[i]});
            }
        }
        for (LocalSong song : indexed) {
            String[] info = listed.get(song.code);
            if (info == null) continue;
            song.title = info[0];
            song.artist = info[1];
            song.key = info[2];
        }
    }

    /**
     * Scans again in the background when the last scan is old, and returns at once: the touch screen's searches use what is known now and never wait
     * for the scan of the box's 40,000 video files, which takes a long time.
     */
    void refreshSoon() {
        if (refreshing || System.currentTimeMillis() - indexedAt < INDEX_MAX_AGE_MS) return;
        refreshing = true;
        new Thread(new Runnable() {
            @Override public void run() {
                try {
                    refreshIfOld();
                } finally {
                    refreshing = false;
                }
            }
        }, "song-scan").start();
    }

    /** True when a video of this song number is stored on this box (as found by the last scan). */
    boolean hasVideo(String code) {
        return videoCodes.contains(code);
    }

    /**
     * Searches the whole box list (title, singer or pinyin; or, with bySinger, the exact singer) from the in-memory index, which is built once from the
     * list file and kept, so every search after the first is instant and even one letter answers. Songs with a video on this box come first.
     * Each answer is {number, title, singer}.
     */
    List<String[]> searchList(String query, boolean bySinger, int limit) {
        if (!isListReady()) return new ArrayList<String[]>(); // still being read: the screen says so instead of waiting
        String wanted = squashedLower(query);
        List<String[]> onBox = new ArrayList<String[]>();
        List<String[]> cloud = new ArrayList<String[]>();
        if (wanted.isEmpty()) return onBox;
        String[] keys = indexKeys;
        String[] rows = indexRows;
        java.util.Set<String> videos = videoCodes;
        String singerEnding = '\t' + query;
        for (int i = 0; i < keys.length && onBox.size() < limit; i++) {
            boolean hit = bySinger ? rows[i].endsWith(singerEnding) : keys[i].contains(wanted);
            if (!hit) continue;
            String[] row = rows[i].split("\t", 3);
            if (videos.contains(row[0])) onBox.add(row);
            else if (cloud.size() < limit) cloud.add(row);
        }
        for (int i = 0; i < cloud.size() && onBox.size() < limit; i++) onBox.add(cloud.get(i));
        return onBox;
    }

    /** Reads the box's list file once into memory (a short search key and a "number, title, singer" row per song); read again only if the file changes. */
    private synchronized void ensureListIndex() {
        File list = biggestBoxList();
        if (list == null || list.length() == indexedListSize) return;
        List<String> keys = new ArrayList<String>();
        List<String> rows = new ArrayList<String>();
        try (java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(list), "UTF-8"), 1 << 16)) {
            String line;
            while ((line = reader.readLine()) != null) {
                int cut = line.indexOf(LIST_SEPARATOR);
                if (cut <= 0) continue;
                String[] fields = splitFields(line);
                if (fields.length <= LIST_SINGER_FIELD || !isDigits(fields[0])) continue;
                String title = fields[LIST_TITLE_FIELD].trim();
                String singer = fields[LIST_SINGER_FIELD].trim();
                keys.add(squashedLower(title + singer + pinyinOf(fields)));
                rows.add(fields[0] + '\t' + title + '\t' + singer);
            }
            indexKeys = keys.toArray(new String[0]);
            indexRows = rows.toArray(new String[0]);
            indexedListSize = list.length();
            OverlayLog.add("song list: " + rows.size() + " songs read from " + list.getName());
        } catch (java.io.IOException | RuntimeException | OutOfMemoryError failed) {
            listProblem = failed.getClass().getSimpleName() + " " + failed.getMessage();
            OverlayLog.add("song list " + list.getName() + ": " + listProblem);
        }
    }

    private static String squashedLower(String line) {
        StringBuilder kept = new StringBuilder(line.length());
        for (int i = 0; i < line.length(); i++) {
            char letter = line.charAt(i);
            if (Character.isLetterOrDigit(letter)) kept.append(Character.toLowerCase(letter));
        }
        return kept.toString();
    }

    private File biggestBoxList() {
        File best = null;
        for (File list : boxLists()) if (list.isFile() && (best == null || list.length() > best.length())) best = list;
        return best;
    }

    private List<File> boxLists() {
        List<File> lists = new ArrayList<File>();
        lists.add(new File(Environment.getExternalStorageDirectory(), BOX_LIST_PATH));
        File[] drives = new File("/storage").listFiles();
        if (drives != null) for (File drive : drives) lists.add(new File(drive, BOX_LIST_PATH));
        return lists;
    }

    /** False until the box's list has been read into memory once (a few seconds to a minute on the box, started when the touch screen opens). */
    boolean isListReady() {
        return indexedListSize >= 0;
    }

    /** The list file exists but is not in memory yet. */
    boolean isListComing() {
        return !isListReady() && listProblem.isEmpty() && biggestBoxList() != null;
    }

    /** What went wrong reading the list ("" = nothing). */
    String listProblem() {
        return listProblem;
    }

    /** The pinyin initials and the full pinyin that follow the "number.mkv" field; the empty fields between them vary from line to line. */
    private static String pinyinOf(String[] fields) {
        StringBuilder pinyin = new StringBuilder();
        boolean afterVideo = false;
        for (String field : fields) {
            if (afterVideo && isLatinWords(field)) pinyin.append(field).append(' ');
            if (field.length() > 4 && field.regionMatches(true, field.length() - 4, ".mkv", 0, 4)) afterVideo = true;
        }
        return pinyin.toString();
    }

    // The list has ~200,000 lines: these are plain loops, not regular expressions, which are far too slow on the box when built per line.
    private static boolean isDigits(String text) {
        if (text.isEmpty()) return false;
        for (int i = 0; i < text.length(); i++) if (text.charAt(i) < '0' || text.charAt(i) > '9') return false;
        return true;
    }

    private static boolean isLatinWords(String text) {
        if (text.isEmpty()) return false;
        for (int i = 0; i < text.length(); i++) {
            char letter = text.charAt(i);
            boolean latin = (letter >= 'a' && letter <= 'z') || (letter >= 'A' && letter <= 'Z') || letter == '\'' || letter == ' ';
            if (!latin) return false;
        }
        return true;
    }

    private static String[] splitFields(String line) {
        List<String> fields = new ArrayList<String>();
        int from = 0;
        while (true) {
            int at = line.indexOf(LIST_SEPARATOR, from);
            if (at < 0) {
                fields.add(line.substring(from));
                break;
            }
            fields.add(line.substring(from, at));
            from = at + LIST_SEPARATOR.length();
        }
        return fields.toArray(new String[0]);
    }

    private static LocalSong describe(File file) {
        LocalSong song = new LocalSong();
        song.file = file;
        String name = baseName(file);
        // The box's own videos are named by their song number (10156426.mkv): that number is the code its song list and the members' requests carry.
        song.code = isDigits(name) ? name : CODE_PREFIX + Integer.toHexString(file.getAbsolutePath().hashCode());
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
        for (File note : notes) {
            String name = note.getName().toLowerCase(Locale.ROOT);
            if (name.equals("songs.txt") || name.equals("song.txt")) report.append("\nLIST ").append(note.getAbsolutePath()).append(": ").append(peekList(note));
        }
        return report.toString();
    }

    /** What a song list file looks like: its first lines and the first line holding the probe title, whether the file is UTF-8 or GBK. */
    private static String peekList(File file) {
        try {
            java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(file), "ISO-8859-1"));
            try {
                String utf8 = new String(PROBE_TITLE.getBytes("UTF-8"), "ISO-8859-1");
                String gbk = new String(PROBE_TITLE.getBytes("GBK"), "ISO-8859-1");
                StringBuilder head = new StringBuilder();
                String hit = "";
                String line;
                int index = 0;
                while ((line = reader.readLine()) != null && hit.isEmpty()) {
                    if (index++ < PEEK_HEAD_LINES) head.append("\n  [").append(index).append("] ").append(decodeLine(line));
                    if (line.contains(utf8) || line.contains(gbk)) hit = decodeLine(line);
                }
                return head + "\n  HIT: " + (hit.isEmpty() ? "none for " + PROBE_TITLE : hit) + "\n  lines read: " + index;
            } finally {
                reader.close();
            }
        } catch (Exception unreadable) {
            return "(not readable: " + unreadable.getClass().getSimpleName() + ")";
        }
    }

    private static String decodeLine(String latin1Line) throws java.io.UnsupportedEncodingException {
        byte[] bytes = latin1Line.getBytes("ISO-8859-1");
        String utf8 = new String(bytes, "UTF-8");
        String shown = utf8.indexOf('�') < 0 ? utf8 : new String(bytes, "GBK");
        return shown.length() > PEEK_LINE_LENGTH ? shown.substring(0, PEEK_LINE_LENGTH) : shown;
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
