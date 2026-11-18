package group.rebornwave.tvoverlay;

import android.content.Context;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;

/** The calls the player makes to the app with the key the box was linked with: the song queue, "this song ended", and the buttons staff press. */
final class QueueClient {
    static final class Song {
        int id = 0;
        String title = "";
        String artist = "";
        String name = "";
        String table = "";
        String vocal = "karaoke";
        String karaokeCode = "";
        int position = 0; // place in the whole queue (1 = next); 0 for the song on now

        /** "Alex (Table 5)" or just the name / table, whichever there is. */
        String who() {
            String tableText = table.isEmpty() ? "" : Words.t("Table ", "桌 ", "Meja ") + table;
            if (name.isEmpty()) return tableText;
            return tableText.isEmpty() ? name : name + " (" + tableText + ")";
        }
    }

    static final class Board {
        Song now = null;
        List<Song> queue = new ArrayList<Song>();
        boolean paused = false;
    }

    private static final int CONNECT_MS = 8_000;
    private static final int READ_MS = 12_000;
    private static final int JOBS_READ_MS = 35_000;
    private static final int MAX_QUEUE_READ = 100; // the lobby shows 12 tables, each with every song it has waiting

    private final Context context;

    QueueClient(Context context) {
        this.context = context.getApplicationContext();
    }

    Board board() throws Exception {
        JSONObject json = call("GET", "/api/karaoke/queue", null);
        Board board = new Board();
        board.paused = json.optBoolean("paused");
        board.now = songOf(json.optJSONObject("nowPlaying"));
        JSONArray waiting = json.optJSONArray("queue");
        if (waiting != null) for (int i = 0; i < Math.min(waiting.length(), MAX_QUEUE_READ); i++) board.queue.add(songOf(waiting.optJSONObject(i)));
        return board;
    }

    /** Says the song on now ended (or was cut short); the app then starts the next one. `finishedId` 0 = just start the next one. */
    void next(int finishedId, boolean skip) throws Exception {
        JSONObject body = new JSONObject();
        if (finishedId > 0) body.put("finishedId", finishedId);
        if (skip) body.put("skip", true);
        call("POST", "/api/karaoke/next", body.toString());
    }

    /** The buttons staff or singers pressed since the last call ("Play", "Mute", "Music_up", "Skip", "Reset" ...). */
    List<String> controls() throws Exception {
        JSONArray commands = call("GET", "/api/karaoke/controls", null).optJSONArray("commands");
        List<String> list = new ArrayList<String>();
        if (commands != null) for (int i = 0; i < commands.length(); i++) list.add(commands.optString(i));
        return list;
    }

    private static Song songOf(JSONObject json) {
        if (json == null) return null;
        Song song = new Song();
        song.id = json.optInt("id");
        song.title = json.optString("title");
        song.artist = json.optString("artist");
        song.name = json.optString("name");
        song.table = json.optString("table");
        song.vocal = json.optString("vocal", "karaoke");
        song.karaokeCode = json.isNull("karaokeCode") ? "" : json.optString("karaokeCode");
        song.position = json.optInt("position");
        return song;
    }

    /** What a member asked the box through the app: a search, the singers, one singer's songs or a photo. */
    static final class Job {
        String id = "";
        String kind = "search";
        String q = "";
        String name = "";
        int page = 1;
        List<String> queries = new ArrayList<String>();
    }

    /** The questions waiting for the box; the app holds the call open up to 20 s so a new search is picked up at once. */
    List<Job> jobs() throws Exception {
        JSONArray waiting = call("GET", "/api/karaoke/jobs", null, JOBS_READ_MS).optJSONArray("jobs");
        List<Job> list = new ArrayList<Job>();
        if (waiting == null) return list;
        for (int i = 0; i < waiting.length(); i++) {
            JSONObject json = waiting.optJSONObject(i);
            if (json == null) continue;
            Job job = new Job();
            job.id = json.optString("id");
            job.kind = json.optString("kind", "search");
            job.q = json.optString("q");
            job.name = json.optString("name");
            job.page = Math.max(1, json.optInt("page", 1));
            JSONArray variants = json.optJSONArray("queries");
            if (variants != null) for (int v = 0; v < variants.length(); v++) job.queries.add(variants.optString(v));
            list.add(job);
        }
        return list;
    }

    void answer(String jobId, JSONObject answer) throws Exception {
        call("POST", "/api/karaoke/jobs/" + jobId, answer.toString());
    }

    private JSONObject call(String method, String route, String body) throws Exception {
        return call(method, route, body, READ_MS);
    }

    private JSONObject call(String method, String route, String body, int readMs) throws Exception {
        String tenant = BridgeSettings.tenant(context);
        HttpURLConnection connection = (HttpURLConnection) new URL(BridgeSettings.cloud(context) + route).openConnection();
        try {
            connection.setRequestMethod(method);
            connection.setConnectTimeout(CONNECT_MS);
            connection.setReadTimeout(readMs);
            connection.setUseCaches(false);
            connection.setRequestProperty("x-karaoke-token", BridgeSettings.token(context));
            if (!tenant.isEmpty()) connection.setRequestProperty("x-tenant-slug", tenant);
            if (body != null) {
                connection.setDoOutput(true);
                connection.setRequestProperty("content-type", "application/json");
                OutputStream out = connection.getOutputStream();
                out.write(body.getBytes("UTF-8"));
                out.close();
            }
            if (connection.getResponseCode() != 200) throw new java.io.IOException("the app answered " + connection.getResponseCode());
            BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), "UTF-8"));
            StringBuilder all = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) all.append(line);
            reader.close();
            return new JSONObject(all.toString());
        } finally {
            connection.disconnect();
        }
    }
}
