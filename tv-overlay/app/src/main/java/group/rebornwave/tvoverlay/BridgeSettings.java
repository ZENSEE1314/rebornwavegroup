package group.rebornwave.tvoverlay;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONException;
import org.json.JSONObject;

/** What the song-system connector on this box remembers: the app's address, its key and (only when it cannot be found by itself) the song system's address. */
final class BridgeSettings {
    private static final String PREFS = "bridge";
    private static final String KEY_CLOUD = "cloud";
    private static final String KEY_TOKEN = "token";
    private static final String KEY_TENANT = "tenant";
    private static final String KEY_BOX = "box";

    private BridgeSettings() {}

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static boolean isReady(Context context) {
        return !prefs(context).getString(KEY_TOKEN, "").isEmpty();
    }

    static void save(Context context, String cloud, String token, String tenant) {
        String clean = cloud.trim();
        while (clean.endsWith("/")) clean = clean.substring(0, clean.length() - 1);
        if (!clean.startsWith("http")) clean = "https://" + clean;
        prefs(context).edit().putString(KEY_CLOUD, clean).putString(KEY_TOKEN, token.trim()).putString(KEY_TENANT, tenant.trim()).apply();
    }

    static void forget(Context context) {
        prefs(context).edit().remove(KEY_TOKEN).apply();
    }

    static void saveBox(Context context, String box) {
        prefs(context).edit().putString(KEY_BOX, box.trim()).apply();
    }

    /** The settings the bridge page starts with: { cloudUrl, token, tenantSlug, boxUrl }. */
    static String json(Context context) {
        SharedPreferences saved = prefs(context);
        JSONObject config = new JSONObject();
        try {
            config.put("cloudUrl", saved.getString(KEY_CLOUD, Link.server(context)));
            config.put("token", saved.getString(KEY_TOKEN, ""));
            config.put("tenantSlug", saved.getString(KEY_TENANT, ""));
            config.put("boxUrl", saved.getString(KEY_BOX, ""));
        } catch (JSONException impossible) {
            throw new IllegalStateException(impossible);
        }
        return config.toString();
    }
}
