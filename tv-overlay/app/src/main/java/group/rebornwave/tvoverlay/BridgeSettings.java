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
    private static final String KEY_PLAYER = "player";
    // A new key name so every box starts again from the default: this app plays the box's own song files (the box's program showed words but never played).
    private static final String KEY_BOX_PLAYBACK = "boxPlayback3";
    private static final String KEY_SHOW_CLOUD = "showCloud";
    private static final String KEY_VOICE_FIRST = "voiceFirst";
    private static final String KEY_CHANNEL_VOICE = "channelVoice";

    private BridgeSettings() {}

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    /** True while this box runs the built-in karaoke player instead of the box's own song program: the connector then stays off, also after a restart. */
    static boolean isPlayerMode(Context context) {
        return prefs(context).getBoolean(KEY_PLAYER, false);
    }

    static void savePlayerMode(Context context, boolean on) {
        prefs(context).edit().putBoolean(KEY_PLAYER, on).apply();
    }

    /** True (the default) when the box's karaoke videos keep the singer's own voice on the first sound track / the left channel and the music on the other. */
    static boolean isVoiceFirst(Context context) {
        return prefs(context).getBoolean(KEY_VOICE_FIRST, true);
    }

    static void saveVoiceFirst(Context context, boolean first) {
        prefs(context).edit().putBoolean(KEY_VOICE_FIRST, first).apply();
    }

    /** True when a video with one stereo sound track keeps voice and music on separate channels (off by default: an ordinary stereo video must stay stereo). */
    static boolean isChannelVoice(Context context) {
        return prefs(context).getBoolean(KEY_CHANNEL_VOICE, false);
    }

    static void saveChannelVoice(Context context, boolean on) {
        prefs(context).edit().putBoolean(KEY_CHANNEL_VOICE, on).apply();
    }

    /**
     * False (the default) leaves out the box's cloud songs (kept in the cloud, not stored on the box); true lists them too. When this app plays the
     * videos itself they are always listed: most common songs are marked cloud, and a request is refused with the song's number only when no video file exists.
     */
    static boolean isShowCloud(Context context) {
        return !isBoxPlayback(context) || prefs(context).getBoolean(KEY_SHOW_CLOUD, false);
    }

    static void saveShowCloud(Context context, boolean show) {
        prefs(context).edit().putBoolean(KEY_SHOW_CLOUD, show).apply();
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

    static String cloud(Context context) {
        return prefs(context).getString(KEY_CLOUD, Link.server(context));
    }

    static String token(Context context) {
        return prefs(context).getString(KEY_TOKEN, "");
    }

    static String tenant(Context context) {
        return prefs(context).getString(KEY_TENANT, "");
    }

    static void forget(Context context) {
        prefs(context).edit().remove(KEY_TOKEN).apply();
    }

    /** The address of the box's own song system saved when it was found ("" until then). */
    static String box(Context context) {
        return prefs(context).getString(KEY_BOX, "");
    }

    /** True when the box's own program plays the songs and this app is its touch screen; false (the default) when this app plays the video files itself. */
    static boolean isBoxPlayback(Context context) {
        return prefs(context).getBoolean(KEY_BOX_PLAYBACK, false);
    }

    static void saveBoxPlayback(Context context, boolean boxPlays) {
        prefs(context).edit().putBoolean(KEY_BOX_PLAYBACK, boxPlays).apply();
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
