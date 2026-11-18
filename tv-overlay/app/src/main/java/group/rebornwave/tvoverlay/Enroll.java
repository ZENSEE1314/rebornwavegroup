package group.rebornwave.tvoverlay;

import android.content.Context;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Links the box by itself, with no code to type, when this app was built with the club's box key (BuildConfig.BOX_KEY): the key is shown to the app's
 * server, which answers with the TV page and the song system's address and key. Used when the box starts, when the app opens, and again whenever the
 * song-system key stops working (it was changed). An app built without the key does nothing here: it is linked with a code as before.
 */
final class Enroll {
    interface Done {
        void onLinked();
    }

    private static final int TIMEOUT_MS = 12_000;
    private static final long RETRY_MS = 15_000;
    private static final int MAX_TRIES = 8;

    private static boolean running = false;

    private Enroll() {}

    static boolean isAvailable() {
        return !BuildConfig.BOX_KEY.isEmpty();
    }

    /** Links in the background, trying again a few times if the internet is not up yet (a box that has just started), then tells `done` on the screen's own thread's handler side. */
    static synchronized void start(final Context context, final Done done) {
        if (!isAvailable() || running) return;
        running = true;
        final Context app = context.getApplicationContext();
        new Thread(new Runnable() {
            @Override public void run() {
                try {
                    for (int attempt = 0; attempt < MAX_TRIES; attempt++) {
                        try {
                            if (link(app)) {
                                if (done != null) done.onLinked();
                                return;
                            }
                        } catch (Exception failure) {
                            OverlayLog.add("enroll: " + failure.getClass().getSimpleName() + " " + failure.getMessage());
                        }
                        try { Thread.sleep(RETRY_MS); } catch (InterruptedException stopped) { return; }
                    }
                } finally {
                    synchronized (Enroll.class) { running = false; }
                }
            }
        }, "enroll").start();
    }

    /** Forgets the song-system key (it stopped working) and asks for the current one. */
    static void relink(Context context, Done done) {
        BridgeSettings.forget(context);
        start(context, done);
    }

    private static boolean link(Context context) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(Link.server(context) + "/api/tv/enroll").openConnection();
        try {
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(TIMEOUT_MS);
            connection.setReadTimeout(TIMEOUT_MS);
            connection.setRequestProperty("x-box-key", BuildConfig.BOX_KEY);
            connection.setDoOutput(true);
            connection.getOutputStream().close();
            if (connection.getResponseCode() != 200) throw new java.io.IOException("the app answered " + connection.getResponseCode());
            BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), "UTF-8"));
            StringBuilder body = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) body.append(line);
            reader.close();
            JSONObject answer = new JSONObject(body.toString());
            Link.savePath(context, answer.getString("path"));
            JSONObject karaoke = answer.getJSONObject("karaoke");
            BridgeSettings.save(context, karaoke.getString("cloudUrl"), karaoke.getString("token"), karaoke.optString("tenantSlug", ""));
            return true;
        } finally {
            connection.disconnect();
        }
    }
}
