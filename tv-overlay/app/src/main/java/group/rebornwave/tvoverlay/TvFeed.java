package group.rebornwave.tvoverlay;

import android.content.Context;
import android.os.Handler;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLDecoder;
import java.net.URLEncoder;

/**
 * Reads the linked TV screen straight from the app, with no web page: the live stream (/api/tv/TOKEN/stream) tells when a gift is sent. What comes
 * in is drawn natively (GiftView). The song now on and the next ones are never drawn over the karaoke picture.
 */
final class TvFeed {
    interface Listener {
        void onGift(Gift gift);
    }

    static final class Gift {
        String id = "";
        String name = "";
        String emoji = "";
        String imageUrl = "";
        String animation = ""; // the scene the admin chose for this gift ("lion", "rose" ...), or empty
        String fromName = "";
        String fromTable = "";
        String toName = "";
        String toTable = "";
        long kgold = 0;
        java.util.List<String[]> topGifters = new java.util.ArrayList<String[]>(); // the receiver's top givers, best first: {name, picture address}
    }

    private static final int CONNECT_MS = 10_000;
    private static final int STREAM_READ_MS = 70_000; // the server sends a keep-alive every 20 s
    private static final long RETRY_AFTER_MS = 5_000;

    private final Context context;
    private final Handler ui;
    private final Listener listener;
    private volatile int generation = 0;

    TvFeed(Context context, Handler ui, Listener listener) {
        this.context = context.getApplicationContext();
        this.ui = ui;
        this.listener = listener;
    }

    /** Follows the TV screen at this path (like /tv/TOKEN?tenant=club); a new call replaces the old one. */
    void start(final String path) {
        final int mine = ++generation;
        final String token = tokenOf(path);
        final String tenant = tenantOf(path);
        if (token.isEmpty()) return;
        new Thread(new Runnable() {
            @Override public void run() { follow(mine, token, tenant); }
        }, "tv-feed").start();
    }

    void stop() {
        generation++;
    }

    private void follow(int mine, String token, String tenant) {
        while (mine == generation) {
            try {
                readStream(mine, token, tenant);
            } catch (Exception failure) {
                OverlayLog.add("feed: " + failure.getClass().getSimpleName() + " " + failure.getMessage());
            }
            try { Thread.sleep(RETRY_AFTER_MS); } catch (InterruptedException stopped) { return; }
        }
    }

    private void readStream(final int mine, final String token, final String tenant) throws Exception {
        HttpURLConnection connection = open("/api/tv/" + token + "/stream", tenant, STREAM_READ_MS);
        connection.setRequestProperty("Accept", "text/event-stream");
        try {
            if (connection.getResponseCode() != 200) {
                OverlayLog.add("feed: the app answered " + connection.getResponseCode());
                return;
            }
            OverlayLog.add("feed: connected");
            BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), "UTF-8"));
            String event = "";
            StringBuilder data = new StringBuilder();
            String line;
            while (mine == generation && (line = reader.readLine()) != null) {
                if (line.startsWith("event:")) event = line.substring(6).trim();
                else if (line.startsWith("data:")) data.append(line.substring(5).trim());
                else if (line.isEmpty()) {
                    handle(mine, token, tenant, event, data.toString());
                    event = "";
                    data.setLength(0);
                }
            }
        } finally {
            connection.disconnect();
        }
    }

    private void handle(final int mine, final String token, final String tenant, String event, String data) {
        if ("gift".equals(event)) {
            try {
                JSONObject json = new JSONObject(data);
                final Gift gift = new Gift();
                gift.id = json.optString("id");
                gift.name = json.optString("giftName");
                gift.emoji = json.optString("emoji");
                gift.imageUrl = json.optString("imageUrl");
                gift.animation = json.optString("animation");
                gift.fromName = json.optString("fromName");
                gift.fromTable = json.optString("fromTable");
                gift.toName = json.optString("toName");
                gift.toTable = json.optString("toTable");
                gift.kgold = json.optLong("kgold");
                org.json.JSONArray tops = json.optJSONArray("topGifters");
                for (int i = 0; tops != null && i < tops.length(); i++) {
                    JSONObject top = tops.optJSONObject(i);
                    String topName = top == null ? "" : top.optString("name");
                    gift.topGifters.add(new String[] {topName.isEmpty() ? "—" : topName, top == null ? "" : top.optString("photo")});
                }
                OverlayLog.add("feed: gift " + gift.name + " from " + gift.fromName);
                ui.post(new Runnable() { @Override public void run() { listener.onGift(gift); } });
            } catch (Exception unreadable) {
                OverlayLog.add("feed: could not read a gift: " + unreadable.getMessage());
            }
        }
    }

    private HttpURLConnection open(String route, String tenant, int readTimeoutMs) throws Exception {
        String address = Link.server(context) + route + (tenant.isEmpty() ? "" : "?tenant=" + URLEncoder.encode(tenant, "UTF-8"));
        HttpURLConnection connection = (HttpURLConnection) new URL(address).openConnection();
        connection.setConnectTimeout(CONNECT_MS);
        connection.setReadTimeout(readTimeoutMs);
        connection.setUseCaches(false);
        if (!tenant.isEmpty()) connection.setRequestProperty("x-tenant-slug", tenant);
        return connection;
    }

    private static String readAll(InputStream in) throws java.io.IOException {
        try {
            BufferedReader reader = new BufferedReader(new InputStreamReader(in, "UTF-8"));
            StringBuilder all = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) all.append(line);
            return all.toString();
        } finally {
            in.close();
        }
    }

    /** /tv/TOKEN or /tv/TOKEN?tenant=club -> TOKEN */
    static String tokenOf(String path) {
        int query = path.indexOf('?');
        String route = query < 0 ? path : path.substring(0, query);
        return route.substring(route.lastIndexOf('/') + 1);
    }

    static String tenantOf(String path) {
        int at = path.indexOf("tenant=");
        if (at < 0) return "";
        String value = path.substring(at + 7);
        int end = value.indexOf('&');
        if (end >= 0) value = value.substring(0, end);
        try { return URLDecoder.decode(value, "UTF-8"); } catch (java.io.UnsupportedEncodingException impossible) { return value; }
    }
}
