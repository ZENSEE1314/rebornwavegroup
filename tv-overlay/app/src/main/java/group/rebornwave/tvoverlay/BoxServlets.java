package group.rebornwave.tvoverlay;

import android.content.Context;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.URL;
import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Enumeration;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorCompletionService;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * The karaoke box's own song system (the program that came with the box), spoken to through the web pages of its phone-ordering page (port 8084): its
 * song list, its singers and its buttons. The new touch screen uses it to search the box's ~200,000 songs, and the box's own program plays them.
 */
final class BoxServlets {
    private static final String CALLBACK = "cb";
    private static final int PORT = 8084;
    private static final String PATH = "demo";
    private static final String LOCAL_ADDRESS = "http://127.0.0.1:" + PORT + "/" + PATH;
    private static final int PROBE_MS = 900;
    private static final int CALL_MS = 8_000;
    private static final int SCAN_WORKERS = 48;
    private static final long TRIAL_WAIT_MS = 3_000;
    private static final int LAST_HOST = 254;
    private static final int SONGS_PER_PAGE = 15;
    private static final int PLAYLIST_NAMES_SHOWN = 3;
    private static final int PLAYLIST_RAW_CHARS = 100;
    private static final String NO_PHOTO = "singer_photo.png";

    private static volatile String known = "";

    private BoxServlets() {}

    /** The address of the box's song system: the one found before, this device itself, or any device of the venue network answering on port 8084; "" when none. */
    static synchronized String find(Context context) {
        if (!known.isEmpty() && isBox(known)) return known;
        String saved = BridgeSettings.box(context);
        List<String> first = new ArrayList<String>();
        if (!saved.isEmpty()) first.add(saved);
        first.add(LOCAL_ADDRESS);
        List<String> ownAddresses = ownAddresses();
        for (String ip : ownAddresses) first.add("http://" + ip + ":" + PORT + "/" + PATH);
        for (String address : first) {
            if (isBox(address)) return remember(context, address);
        }
        String scanned = scan(ownAddresses);
        return scanned.isEmpty() ? "" : remember(context, scanned);
    }

    /** What the touch screen can say about the box's song system, for the "Test" button: where it was found, and what its search and singers pages really answer. */
    static String diagnose(Context context) {
        StringBuilder report = new StringBuilder();
        String base = find(context);
        if (base.isEmpty()) {
            return Words.t("NOT FOUND. Tried: the saved address, 127.0.0.1:8084, this device's own addresses " + ownAddresses() + " and every address of those networks on port 8084.",
                    "未找到。已尝试：已保存的地址、127.0.0.1:8084、本机地址 " + ownAddresses() + " 以及这些网络的所有地址（端口 8084）。",
                    "TIDAK DITEMUKAN. Dicoba: alamat tersimpan, 127.0.0.1:8084, alamat perangkat ini " + ownAddresses() + " dan semua alamat jaringan itu di port 8084.");
        }
        report.append(Words.t("Found at ", "已找到：", "Ditemukan di ")).append(base);
        try {
            Page page = search(base, "a", "", 1, BridgeSettings.isShowCloud(context));
            report.append("\n").append(Words.t("Search \"a\": ", "搜索“a”：", "Cari \"a\": ")).append(page.rawCount).append(" / ").append(page.songs.size()).append(" on the box");
            if (!page.songs.isEmpty()) report.append(" — ").append(page.songs.get(0).title);
        } catch (Exception failure) {
            report.append("\nSearch failed: ").append(failure.getClass().getSimpleName()).append(' ').append(failure.getMessage());
        }
        try {
            report.append("\nSingers page 1: ").append(singers(base, 1).size());
            report.append("\nSingerServlet says: ").append(shortAnswer(base + "/SingerServlet?singer=&singerType=&sortType=&page=1&jsonpCallback=" + CALLBACK));
        } catch (Exception failure) {
            report.append("\nSingers failed: ").append(failure.getClass().getSimpleName()).append(' ').append(failure.getMessage());
        }
        return report.toString();
    }

    /**
     * A live trial for the "Order a test song" button: orders one real song stored on the box, waits 3 seconds, and reports exactly what the box answered
     * and what its play list says before and after, then cuts the song. It shows whether the box takes an order from this app at all.
     */
    static String trial(Context context) {
        StringBuilder report = new StringBuilder();
        String base = find(context);
        if (base.isEmpty()) return "The box's song system was not found (see the other test).";
        try {
            SongPick song = null;
            for (int page = 1; page <= 6 && song == null; page++) {
                Page found = search(base, "a", "", page, false);
                if (!found.songs.isEmpty()) song = found.songs.get(0);
            }
            if (song == null) return "No song stored on the box was found for the letter a (try showing cloud songs).";
            report.append("Test song: ").append(song.code).append("  ").append(song.title);
            report.append("\nPlay list before: ").append(playlistCount(base));
            report.append("\nAdd1 answer: ").append(shortAnswer(base + "/CommandServlet?cmd=Add1&cmdValue=" + enc(song.code) + "&jsonpCallback=" + CALLBACK));
            Thread.sleep(TRIAL_WAIT_MS);
            report.append("\nPlay list after 3 s: ").append(playlistCount(base));
            report.append("\nPlaylistServlet says: ").append(shortAnswer(base + "/PlaylistServlet?onSelectPage=true&click=true&type=1&jsonpCallback=" + CALLBACK));
            command(base, "Skip");
            report.append("\n(the test song was cut with Skip)");
        } catch (Exception failure) {
            report.append("\nFailed: ").append(failure.getClass().getSimpleName()).append(' ').append(failure.getMessage());
        }
        return report.toString();
    }

    private static String shortAnswer(String address) {
        try {
            String body = text(address, CALL_MS);
            return body.length() > 160 ? body.substring(0, 160) + "..." : body;
        } catch (Exception failure) {
            return failure.getClass().getSimpleName() + " " + failure.getMessage();
        }
    }

    /** The address of the box's song system found so far ("" before it is found). */
    static String address() {
        return known;
    }

    private static String remember(Context context, String address) {
        known = address;
        BridgeSettings.saveBox(context, address);
        return address;
    }

    /** Does a box answer here? Its song search replies with a song list. */
    static boolean isBox(String base) {
        try {
            return text(base + "/SearchServlet?songName=a&page=1&jsonpCallback=" + CALLBACK, PROBE_MS).contains("songList");
        } catch (Exception unreachable) {
            return false;
        }
    }

    private static List<String> ownAddresses() {
        List<String> addresses = new ArrayList<String>();
        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces != null && interfaces.hasMoreElements()) {
                Enumeration<InetAddress> found = interfaces.nextElement().getInetAddresses();
                while (found.hasMoreElements()) {
                    InetAddress address = found.nextElement();
                    if (address instanceof Inet4Address && !address.isLoopbackAddress()) addresses.add(address.getHostAddress());
                }
            }
        } catch (Exception unreadable) {
            OverlayLog.add("box: own addresses not read: " + unreadable.getMessage());
        }
        return addresses;
    }

    /** Every address of the networks this device is on, port 8084, side by side; the first that is a box wins. */
    private static String scan(List<String> ownAddresses) {
        List<String> candidates = new ArrayList<String>();
        for (String own : ownAddresses) {
            String prefix = own.substring(0, own.lastIndexOf('.') + 1);
            for (int host = 1; host <= LAST_HOST; host++) {
                String ip = prefix + host;
                if (!ip.equals(own)) candidates.add("http://" + ip + ":" + PORT + "/" + PATH);
            }
        }
        if (candidates.isEmpty()) return "";
        ExecutorService pool = Executors.newFixedThreadPool(SCAN_WORKERS);
        ExecutorCompletionService<String> done = new ExecutorCompletionService<String>(pool);
        try {
            for (final String candidate : candidates) {
                done.submit(new Callable<String>() {
                    @Override public String call() { return isBox(candidate) ? candidate : ""; }
                });
            }
            for (int i = 0; i < candidates.size(); i++) {
                String hit = done.take().get();
                if (!hit.isEmpty()) return hit;
            }
        } catch (Exception interrupted) {
            return "";
        } finally {
            pool.shutdownNow();
        }
        return "";
    }

    /** One page of the box's song search: the songs on the box itself, and how many songs the page had in all (15 until the end of the list). */
    static final class Page {
        final List<SongPick> songs;
        final int rawCount;
        final int cloudHidden;

        Page(List<SongPick> songs, int rawCount, int cloudHidden) {
            this.songs = songs;
            this.rawCount = rawCount;
            this.cloudHidden = cloudHidden;
        }

        boolean isLast() {
            return rawCount < SONGS_PER_PAGE;
        }
    }

    /** One page (15 songs) of the box's song search: by title / pinyin letters, or by singer. Songs kept in the cloud (not on the box) are left out. */
    static Page search(String base, String songName, String singer, int page, boolean includeCloud) throws Exception {
        JSONObject answer = call(base, "SearchServlet", "songName=" + enc(songName) + "&songType=&singer=" + enc(singer) + "&lang=&sortType=&page=" + page);
        JSONArray raw = new JSONArray(answer.optString("songList", "[]"));
        List<SongPick> songs = picks(raw, includeCloud);
        int cloudSongs = 0;
        for (int i = 0; i < raw.length(); i++) if (raw.optJSONObject(i) != null && raw.optJSONObject(i).optInt("cLOUD") == 1) cloudSongs++;
        return new Page(songs, raw.length(), includeCloud ? 0 : cloudSongs);
    }

    /** How many pages the box's whole song list has (for "new songs": the last pages). */
    static int songPages(String base) throws Exception {
        return Math.max(1, call(base, "SearchServlet", "songName=&songType=&singer=&lang=&sortType=&page=1").optInt("maxPage", 1));
    }

    /** One page of the box's singers and how many pages the list has. */
    static final class SingerPage {
        final List<String[]> singers;
        final int maxPage;

        SingerPage(List<String[]> singers, int maxPage) {
            this.singers = singers;
            this.maxPage = maxPage;
        }
    }

    /** One page of the box's singers: { name, photo address or "" }. */
    static List<String[]> singers(String base, int page) throws Exception {
        return singersPage(base, page, "").singers;
    }

    static List<String[]> singers(String base, int page, String text) throws Exception {
        return singersPage(base, page, text).singers;
    }

    static SingerPage singersPage(String base, int page) throws Exception {
        return singersPage(base, page, "");
    }

    /** One page of the singers whose name (or pinyin letters) holds `text`; the box's own singer list is ~28,000 long, so a typed name is asked of the box. */
    static SingerPage singersPage(String base, int page, String text) throws Exception {
        JSONObject answer = call(base, "SingerServlet", "singer=" + enc(text) + "&singerType=&sortType=&page=" + page);
        // Like the song list, the singer list comes as a JSON text inside the answer.
        Object raw = answer.opt("singerList");
        JSONArray list = raw instanceof JSONArray ? (JSONArray) raw : (raw == null ? null : new JSONArray(String.valueOf(raw)));
        List<String[]> singers = new ArrayList<String[]>();
        if (list == null) return new SingerPage(singers, 1);
        for (int i = 0; i < list.length(); i++) {
            JSONObject item = list.optJSONObject(i);
            if (item == null || item.optString("name").isEmpty()) continue;
            String picture = item.optString("picture");
            singers.add(new String[]{item.optString("name"), picture.isEmpty() || NO_PHOTO.equals(picture) ? "" : base + "/singer/" + picture});
        }
        return new SingerPage(singers, Math.max(1, answer.optInt("maxPage", 1)));
    }

    /** A singer's photo file of the box (its bytes), or null. */
    static byte[] photo(String base, String file) {
        try {
            return bytes(base + "/singer/" + file, CALL_MS);
        } catch (Exception unreachable) {
            return null;
        }
    }

    /** How many songs the box has in its play list right now (the one playing and the ones waiting): 0 means the box is idle. */
    static int playlistCount(String base) throws Exception {
        Object number = call(base, "PlaylistServlet", "onSelectPage=false&click=false&type=1").opt("number");
        try {
            return number == null ? 0 : Integer.parseInt(String.valueOf(number).trim());
        } catch (NumberFormatException notANumber) {
            return 0;
        }
    }

    /** The titles of the first songs in the box's play list (what it holds now), for the touch screen's status line; the raw start of its answer if no title is found. */
    static String playlistNames(String base) {
        try {
            String body = text(base + "/PlaylistServlet?onSelectPage=true&click=true&type=1&jsonpCallback=" + CALLBACK, CALL_MS);
            java.util.regex.Matcher found = java.util.regex.Pattern.compile("\"sONGNAME\"\\s*:\\s*\"([^\"]*)\"").matcher(body);
            StringBuilder names = new StringBuilder();
            int shown = 0;
            while (found.find() && shown < PLAYLIST_NAMES_SHOWN) names.append(shown++ > 0 ? " | " : "").append(found.group(1));
            if (shown > 0) return names.toString();
            return body.length() > PLAYLIST_RAW_CHARS ? body.substring(0, PLAYLIST_RAW_CHARS) : body;
        } catch (Exception unreadable) {
            return "?";
        }
    }

    /** Presses a button of the box's own player: "Mute", "Music_up", "Music_down", "Tone_up", "Tone_down", "Play", "Reset", "MuOr", "Skip" ... */
    static String command(String base, String button) throws Exception {
        return command(base, button, "");
    }

    /** The same with a value: "Add1" with a song number orders that song on the box, "Del1" with the box's number of a waiting song removes it. */
    static String command(String base, String button, String value) throws Exception {
        return text(base + "/CommandServlet?cmd=" + enc(button) + "&cmdValue=" + enc(value) + "&jsonpCallback=" + CALLBACK, CALL_MS);
    }

    private static List<SongPick> picks(JSONArray songs, boolean includeCloud) {
        List<SongPick> list = new ArrayList<SongPick>();
        for (int i = 0; i < songs.length(); i++) {
            JSONObject song = songs.optJSONObject(i);
            if (song == null || (!includeCloud && song.optInt("cLOUD") == 1)) continue;
            String code = song.optString("sONGBM");
            if (code.isEmpty() || song.optString("sONGNAME").isEmpty()) continue;
            list.add(new SongPick(code, song.optString("sONGNAME"), singerOf(song.optString("sINGER")), song.optInt("cLOUD") == 1));
        }
        return list;
    }

    /** The box writes "<the title in pinyin>  <singer>, <singer>" in the singer field: the singers are what follows the double space. */
    static String singerOf(String field) {
        String[] parts = field.split("\\s{2,}");
        return (parts.length > 1 ? join(parts) : parts[0]).trim();
    }

    private static String join(String[] parts) {
        StringBuilder rest = new StringBuilder();
        for (int i = 1; i < parts.length; i++) rest.append(i > 1 ? " " : "").append(parts[i]);
        return rest.toString();
    }

    private static JSONObject call(String base, String servlet, String query) throws Exception {
        String body = text(base + "/" + servlet + "?" + query + "&jsonpCallback=" + CALLBACK, CALL_MS);
        int start = body.indexOf('(');
        int end = body.lastIndexOf(')');
        if (start < 0 || end < start) throw new java.io.IOException("not an answer of the box's song system");
        return new JSONObject(body.substring(start + 1, end));
    }

    private static byte[] bytes(String address, int timeoutMs) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(address).openConnection();
        try {
            connection.setConnectTimeout(timeoutMs);
            connection.setReadTimeout(timeoutMs);
            java.io.InputStream in = connection.getInputStream();
            java.io.ByteArrayOutputStream all = new java.io.ByteArrayOutputStream();
            byte[] chunk = new byte[8192];
            int read;
            while ((read = in.read(chunk)) > 0) all.write(chunk, 0, read);
            in.close();
            return all.toByteArray();
        } finally {
            connection.disconnect();
        }
    }

    private static String text(String address, int timeoutMs) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(address).openConnection();
        try {
            connection.setConnectTimeout(timeoutMs);
            connection.setReadTimeout(timeoutMs);
            connection.setUseCaches(false);
            BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), "UTF-8"));
            StringBuilder all = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) all.append(line);
            reader.close();
            return all.toString();
        } finally {
            connection.disconnect();
        }
    }

    private static String enc(String value) throws Exception {
        return URLEncoder.encode(value == null ? "" : value, "UTF-8");
    }

    static List<SongPick> reversed(List<SongPick> list) {
        List<SongPick> copy = new ArrayList<SongPick>(list);
        Collections.reverse(copy);
        return copy;
    }
}
