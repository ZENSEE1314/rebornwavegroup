package group.rebornwave.tvoverlay;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

/** What this box remembers (the app's address and the page of the TV screen it was linked to) and the two calls used to link it. */
final class Link {
    static final String DEFAULT_SERVER = "https://rebornwave.group";
    private static final String PREFS = "tv";
    private static final String KEY_SERVER = "server";
    private static final String KEY_PATH = "path";
    private static final int TIMEOUT_MS = 8000;

    private Link() {}

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static String server(Context context) {
        return prefs(context).getString(KEY_SERVER, DEFAULT_SERVER);
    }

    static void saveServer(Context context, String address) {
        String clean = address.trim();
        while (clean.endsWith("/")) clean = clean.substring(0, clean.length() - 1);
        if (!clean.startsWith("http")) clean = "https://" + clean;
        prefs(context).edit().putString(KEY_SERVER, clean).apply();
    }

    /** The page of the linked TV screen, e.g. /tv/abc123?tenant=my-club, or "" while this box is not linked. */
    static String path(Context context) {
        return prefs(context).getString(KEY_PATH, "");
    }

    static void savePath(Context context, String path) {
        prefs(context).edit().putString(KEY_PATH, path).apply();
    }

    static boolean isLinked(Context context) {
        return !path(context).isEmpty();
    }

    static void unlink(Context context) {
        prefs(context).edit().remove(KEY_PATH).apply();
    }

    static String pageUrl(Context context) {
        return server(context) + path(context);
    }

    /** POST /api/tv/pair → the 6-digit code to show. */
    static String newCode(Context context) throws Exception {
        return call(server(context) + "/api/tv/pair", "POST").getString("code");
    }

    /** GET /api/tv/pair/CODE → "waiting", "expired", or "linked" (then the page is saved). */
    static String poll(Context context, String code) throws Exception {
        JSONObject answer = call(server(context) + "/api/tv/pair/" + code, "GET");
        String status = answer.optString("status", "waiting");
        if ("linked".equals(status)) savePath(context, answer.getString("path"));
        return status;
    }

    private static JSONObject call(String address, String method) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(address).openConnection();
        try {
            connection.setRequestMethod(method);
            connection.setConnectTimeout(TIMEOUT_MS);
            connection.setReadTimeout(TIMEOUT_MS);
            connection.setUseCaches(false);
            if ("POST".equals(method)) {
                connection.setDoOutput(true);
                connection.getOutputStream().close();
            }
            BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream(), "UTF-8"));
            StringBuilder body = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) body.append(line);
            reader.close();
            return new JSONObject(body.toString());
        } finally {
            connection.disconnect();
        }
    }
}
