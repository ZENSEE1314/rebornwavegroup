package group.rebornwave.tvoverlay;

import android.content.Context;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.regex.Pattern;

/**
 * The animated picture of each kind of gift (a rose that blooms, a roaring lion, a whale, fireworks ...): which one a gift gets (the same words and
 * emoji the app's own gift scenes go by) and the files, which the box downloads once from the app and keeps. The clips are transparent animated WebP
 * files in /gift-fx/anim/ (the lion, whale, car and teddy are the club's own clips; the rest are Google's Noto animated emoji, CC BY 4.0).
 */
final class GiftArt {
    private static final String[] SCENES = {"car", "fireworks", "crown", "diamonds", "kiss", "thumbsup", "lion", "whale", "rocket", "rose", "heart", "drink", "cake", "teddy", "money", "gift"};
    private static final String FALLBACK = "gift";
    private static final String VERSION = "1"; // raise it when a clip is replaced on the server, so boxes fetch the new one
    private static final int TIMEOUT_MS = 30_000;

    private static final String[][] RULES = {
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
    };

    private static final Pattern[] PATTERNS = compile();
    private static boolean fetching = false;

    private GiftArt() {}

    private static Pattern[] compile() {
        Pattern[] patterns = new Pattern[RULES.length];
        for (int i = 0; i < RULES.length; i++) patterns[i] = Pattern.compile(RULES[i][1], Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
        return patterns;
    }

    /** The scene of a gift: the one the admin chose for it, else the one its emoji or name points to, else the gift box. */
    static String sceneOf(TvFeed.Gift gift) {
        for (String scene : SCENES) if (scene.equals(gift.animation)) return scene;
        String text = gift.emoji + " " + gift.name;
        for (int i = 0; i < RULES.length; i++) if (PATTERNS[i].matcher(text).find()) return RULES[i][0];
        return FALLBACK;
    }

    static boolean isFallback(String scene) {
        return FALLBACK.equals(scene);
    }

    /** The saved clip of a scene, or null while this box does not have it yet. */
    static File cached(Context context, String scene) {
        File file = fileOf(context, scene);
        return file.exists() ? file : null;
    }

    /** Downloads, once and in the background, every clip this box does not have yet, so the first gift already plays its animation. */
    static synchronized void prefetch(final Context context) {
        if (fetching) return;
        fetching = true;
        final Context app = context.getApplicationContext();
        new Thread(new Runnable() {
            @Override public void run() {
                for (String scene : SCENES) {
                    if (cached(app, scene) != null) continue;
                    try {
                        download(app, scene);
                    } catch (Exception failure) {
                        OverlayLog.add("gift art " + scene + ": " + failure.getClass().getSimpleName() + " " + failure.getMessage());
                    }
                }
                synchronized (GiftArt.class) { fetching = false; }
            }
        }, "gift-art").start();
    }

    private static File fileOf(Context context, String scene) {
        File folder = new File(context.getFilesDir(), "gift-art");
        if (!folder.exists()) folder.mkdirs();
        return new File(folder, scene + "-v" + VERSION + ".webp");
    }

    private static void download(Context context, String scene) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(Link.server(context) + "/gift-fx/anim/" + scene + ".webp").openConnection();
        File part = new File(fileOf(context, scene).getPath() + ".part");
        try {
            connection.setConnectTimeout(TIMEOUT_MS);
            connection.setReadTimeout(TIMEOUT_MS);
            if (connection.getResponseCode() != 200) throw new java.io.IOException("the app answered " + connection.getResponseCode());
            InputStream in = connection.getInputStream();
            FileOutputStream out = new FileOutputStream(part);
            byte[] chunk = new byte[16 * 1024];
            int read;
            while ((read = in.read(chunk)) > 0) out.write(chunk, 0, read);
            out.close();
            in.close();
            if (!part.renameTo(fileOf(context, scene))) throw new java.io.IOException("could not save the clip");
        } finally {
            connection.disconnect();
            if (part.exists()) part.delete();
        }
    }
}
