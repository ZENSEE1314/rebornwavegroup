package group.rebornwave.tvoverlay;

import android.content.Context;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.regex.Pattern;

/**
 * What a gift looks like on the box. In this order: the club's own clip when the gift is a lion, whale, car or teddy; one of the club's two posters
 * for heart gifts and gift-box gifts; the gift's own picture; the animation of the very emoji the gift was sent with (Google's Noto animated emoji,
 * CC BY 4.0, fetched once and kept); the animation of the gift's kind of scene; the plain emoji. The files are transparent animated WebP clips in
 * /gift-fx/anim/ and posters in /gift-fx/poster/ on the app's server, downloaded by the box once.
 */
final class GiftArt {
    private static final String[] SCENES = {"car", "fireworks", "crown", "diamonds", "kiss", "thumbsup", "lion", "whale", "rocket", "rose", "heart", "drink", "cake", "teddy", "money", "gift", "castle", "love520", "ring", "jet", "forever"};
    private static final String[] CLUB_CLIPS = {"lion", "whale", "car", "teddy", "castle", "love520", "ring", "jet", "forever"};
    private static final String[] POSTERS = {"heart", "gift"};
    private static final String NO_SCENE = "";
    private static final String VERSION = "1"; // raise it when a clip is replaced on the server, so boxes fetch the new one
    private static final String NOTO = "https://fonts.gstatic.com/s/e/notoemoji/latest/";
    private static final String VARIATION_SELECTOR = "_fe0f";
    private static final int TIMEOUT_MS = 30_000;
    private static final int NOT_FOUND = 404;

    private static final String[][] RULES = {
        {"castle", "🏰|castle|istana|城堡"},
        {"ring", "1314|💍|\\bring\\b|cincin|戒指"},
        {"jet", "✈|🛩|\\bjet\\b|pesawat|飞机"},
        {"love520", "\\b520\\b"},
        {"kiss", "💋|\\bkiss\\b|cium|亲"},
        {"thumbsup", "👍|thumbs? ?up|jempol|点赞"},
        {"lion", "🦁|\\blion\\b|singa|狮"},
        {"whale", "🐋|🐳|whale|paus|鲸"},
        {"rocket", "🚀|rocket|roket|火箭"},
        {"car", "🏎|🚗|🚙|🚘|sports ?car|\\bcar\\b"},
        {"fireworks", "🎆|🎇|🧨|firework"},
        {"crown", "👑|crown"},
        {"diamonds", "💎|diamond"},
        {"rose", "🌹|🌷|🌸|💐|🌺|🌻|rose|flower|bunga|花"},
        {"heart", "❤|💖|💕|💗|💘|💝|🩷|heart|love|hati|心"},
        {"drink", "🍾|🥂|🍷|🍸|🍺|🍻|🍹|🥃|beer|wine|champagne|drink|\\bbir\\b|酒"},
        {"cake", "🎂|🍰|🧁|cake|kue|蛋糕"},
        {"teddy", "🧸|🐶|🐱|🐼|🐰|🦖|🐉|teddy|bear|boneka|doluruu|熊"},
        {"money", "💰|💵|💸|💴|🪙|money|cash|coin|uang|钱"},
        {"gift", "🎁|\\bgift\\b|hadiah|礼物|present"},
    };

    private static final Pattern[] PATTERNS = compile();
    private static boolean fetching = false;

    private GiftArt() {}

    private static Pattern[] compile() {
        Pattern[] patterns = new Pattern[RULES.length];
        for (int i = 0; i < RULES.length; i++) patterns[i] = Pattern.compile(RULES[i][1], Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
        return patterns;
    }

    /** The scene of a gift: the one the admin chose for it, else the one its emoji or name points to, else none (the gift then shows its own picture or emoji). */
    static String sceneOf(TvFeed.Gift gift) {
        for (String scene : SCENES) if (scene.equals(gift.animation)) return scene;
        String text = gift.emoji + " " + gift.name;
        for (int i = 0; i < RULES.length; i++) if (PATTERNS[i].matcher(text).find()) return RULES[i][0];
        return NO_SCENE;
    }

    static boolean isClubClip(String scene) {
        return contains(CLUB_CLIPS, scene);
    }

    static boolean isPoster(String scene) {
        return contains(POSTERS, scene);
    }

    private static boolean contains(String[] list, String scene) {
        for (String item : list) if (item.equals(scene)) return true;
        return false;
    }

    /** The saved clip of a scene, or null while this box does not have it yet. */
    static File cached(Context context, String scene) {
        File file = fileOf(context, scene);
        return file.exists() ? file : null;
    }

    /** The saved poster of a scene, or null while this box does not have it yet. */
    static File poster(Context context, String scene) {
        File file = fileOf(context, "poster-" + scene);
        return file.exists() ? file : null;
    }

    /**
     * The animation of this very emoji from Google's Noto animated emoji, downloaded the first time it is needed and kept; null when Google has none
     * for it (or the box is offline). Reads the network: call it off the screen's own thread.
     */
    static File emojiClip(Context context, String emoji) {
        String code = codeOf(emoji);
        if (code.isEmpty()) return null;
        File saved = fileOf(context, "emoji-" + code);
        if (saved.exists()) return saved;
        File none = new File(saved.getPath() + ".none");
        if (none.exists()) return null;
        boolean sawOnlyNotFound = true;
        for (String variant : variantsOf(code)) {
            try {
                if (fetchTo(saved, NOTO + variant + "/512.webp")) return saved;
            } catch (Exception failure) {
                sawOnlyNotFound = false;
                OverlayLog.add("emoji clip " + variant + ": " + failure.getClass().getSimpleName() + " " + failure.getMessage());
            }
        }
        if (sawOnlyNotFound) {
            try { none.createNewFile(); } catch (java.io.IOException ignored) { /* it will just ask again next time */ }
        }
        return null;
    }

    /** Hex code points of an emoji joined by "_" ("1f37a", "2764_fe0f"), the way Google names its files. */
    static String codeOf(String emoji) {
        String text = emoji == null ? "" : emoji.trim();
        StringBuilder code = new StringBuilder();
        for (int i = 0; i < text.length(); ) {
            int point = text.codePointAt(i);
            i += Character.charCount(point);
            if (code.length() > 0) code.append('_');
            code.append(Integer.toHexString(point));
        }
        return code.toString();
    }

    private static String[] variantsOf(String code) {
        // Google names some emoji with the variation selector (2764_fe0f) and some without: try the name as it is, then the other way.
        return code.endsWith(VARIATION_SELECTOR) ? new String[]{code, code.substring(0, code.length() - VARIATION_SELECTOR.length())} : new String[]{code, code + VARIATION_SELECTOR};
    }

    /** Downloads, once and in the background, every clip and poster this box does not have yet, so the first gift already plays its animation. */
    static synchronized void prefetch(final Context context) {
        if (fetching) return;
        fetching = true;
        final Context app = context.getApplicationContext();
        new Thread(new Runnable() {
            @Override public void run() {
                for (String scene : SCENES) {
                    if (cached(app, scene) == null) tryFetch(app, fileOf(app, scene), "/gift-fx/anim/" + scene + ".webp");
                }
                for (String scene : POSTERS) {
                    if (poster(app, scene) == null) tryFetch(app, fileOf(app, "poster-" + scene), "/gift-fx/poster/" + scene + ".webp");
                }
                synchronized (GiftArt.class) { fetching = false; }
            }
        }, "gift-art").start();
    }

    private static void tryFetch(Context context, File target, String route) {
        try {
            fetchTo(target, Link.server(context) + route);
        } catch (Exception failure) {
            OverlayLog.add("gift art " + route + ": " + failure.getClass().getSimpleName() + " " + failure.getMessage());
        }
    }

    private static File fileOf(Context context, String name) {
        File folder = new File(context.getFilesDir(), "gift-art");
        if (!folder.exists()) folder.mkdirs();
        return new File(folder, name + "-v" + VERSION + ".webp");
    }

    /** Saves the file at this address; false when it does not exist (404), an exception for any other failure. */
    private static boolean fetchTo(File target, String address) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(address).openConnection();
        File part = new File(target.getPath() + ".part");
        try {
            connection.setConnectTimeout(TIMEOUT_MS);
            connection.setReadTimeout(TIMEOUT_MS);
            int status = connection.getResponseCode();
            if (status == NOT_FOUND) return false;
            if (status != 200) throw new java.io.IOException("answered " + status);
            InputStream in = connection.getInputStream();
            FileOutputStream out = new FileOutputStream(part);
            byte[] chunk = new byte[16 * 1024];
            int read;
            while ((read = in.read(chunk)) > 0) out.write(chunk, 0, read);
            out.close();
            in.close();
            if (!part.renameTo(target)) throw new java.io.IOException("could not save the file");
            return true;
        } finally {
            connection.disconnect();
            if (part.exists()) part.delete();
        }
    }
}
