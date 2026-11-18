package group.rebornwave.tvoverlay;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.media.MediaMetadataRetriever;
import android.os.Handler;
import android.os.Looper;
import android.util.LruCache;
import android.widget.ImageView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * The picture of a singer, in this order: a photo the club put in a folder "Singers" next to its videos (Karaoke/Singers/Jay Chou.jpg), one saved
 * earlier, or one found once on Deezer's public artist search (only the singer's name is sent; a result is used only when its name is the same) and
 * then kept on the box. No picture = the caller keeps its icon.
 */
final class SingerPhotos {
    private static final String SINGERS_FOLDER = "Singers";
    private static final String[] ENDINGS = {".jpg", ".jpeg", ".png", ".webp"};
    private static final String SEARCH = "https://api.deezer.com/search/artist?limit=3&q=";
    private static final String THUMBNAIL = "https://i.ytimg.com/vi/";
    private static final int YOUTUBE_PREFIX_LENGTH = 3; // "yt:"
    private static final long FRAME_AT_US = 8_000_000; // eight seconds in: past the title card
    private static final int FRAME_WIDTH_PX = 160;
    private static final int TIMEOUT_MS = 8_000;
    private static final int MAX_PICTURE_BYTES = 600_000;
    private static final int MEMORY_PICTURES = 60;
    private static final int WORKERS = 3;

    private final Context context;
    private final SongFiles files;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private final ExecutorService workers = Executors.newFixedThreadPool(WORKERS);
    private final LruCache<String, Bitmap> memory = new LruCache<String, Bitmap>(MEMORY_PICTURES);
    private final Set<String> notFound = new HashSet<String>();
    private final java.util.Map<String, String> boxPhotos = new java.util.concurrent.ConcurrentHashMap<String, String>();

    SingerPhotos(Context context, SongFiles files) {
        this.context = context.getApplicationContext();
        this.files = files;
    }

    /** Shows the singer's picture in the view when one is found; a view that was given another singer meanwhile is left alone. */
    void load(final String singer, final ImageView view) {
        final String key = SongFiles.squash(singer);
        view.setTag(key);
        view.setVisibility(ImageView.GONE);
        if (key.isEmpty()) return;
        Bitmap kept = memory.get(key);
        if (kept != null) {
            show(view, key, kept);
            return;
        }
        workers.execute(new Runnable() {
            @Override public void run() {
                final Bitmap found = find(singer, key);
                if (found == null) return;
                memory.put(key, found);
                ui.post(new Runnable() { @Override public void run() { show(view, key, found); } });
            }
        });
    }

    /**
     * A picture for a song row: the singer's photo; else, for a YouTube song, the video's own thumbnail; else a frame of the video on this box.
     * The view stays hidden (the caller's icon shows) when none can be made.
     */
    void loadForSong(final SongPick pick, final ImageView view) {
        final String key = "song:" + pick.code;
        view.setTag(key);
        view.setVisibility(ImageView.GONE);
        Bitmap kept = memory.get(key);
        if (kept != null) {
            show(view, key, kept);
            return;
        }
        workers.execute(new Runnable() {
            @Override public void run() {
                final Bitmap found = songPicture(pick);
                if (found == null) return;
                memory.put(key, found);
                ui.post(new Runnable() { @Override public void run() { show(view, key, found); } });
            }
        });
    }

    private Bitmap songPicture(SongPick pick) {
        if (pick.isYoutube()) return thumbnail(pick.code.substring(YOUTUBE_PREFIX_LENGTH));
        if (!pick.artist.isEmpty()) {
            Bitmap singer = find(pick.artist, SongFiles.squash(pick.artist));
            if (singer != null) return singer;
        }
        SongFiles.LocalSong local = files.byCode(pick.code);
        return local == null ? null : frameOf(local.file);
    }

    private static Bitmap thumbnail(String videoId) {
        try {
            byte[] bytes = readBytes(THUMBNAIL + videoId + "/mqdefault.jpg");
            return BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
        } catch (Exception unavailable) {
            return null;
        }
    }

    private static Bitmap frameOf(File video) {
        MediaMetadataRetriever retriever = new MediaMetadataRetriever();
        try {
            retriever.setDataSource(video.getPath());
            Bitmap frame = retriever.getFrameAtTime(FRAME_AT_US);
            if (frame == null) return null;
            return Bitmap.createScaledBitmap(frame, FRAME_WIDTH_PX, Math.max(1, FRAME_WIDTH_PX * frame.getHeight() / frame.getWidth()), true);
        } catch (Exception unreadable) {
            return null;
        } finally {
            try { retriever.release(); } catch (Exception ignored) { /* nothing to free */ }
        }
    }

    void close() {
        workers.shutdownNow();
    }

    private static void show(ImageView view, String key, Bitmap picture) {
        if (!key.equals(view.getTag())) return;
        view.setImageBitmap(picture);
        view.setVisibility(ImageView.VISIBLE);
    }

    /** The box's own program has a photo for many singers: its address, remembered by the singer's name, is tried before anything else. */
    void addBoxPhoto(String singer, String address) {
        boxPhotos.put(SongFiles.squash(singer), address);
    }

    private Bitmap find(String singer, String key) {
        String boxAddress = boxPhotos.get(key);
        if (boxAddress != null) {
            try {
                byte[] bytes = readBytes(boxAddress);
                Bitmap fromBox = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
                if (fromBox != null) return fromBox;
            } catch (Exception unreachable) {
                OverlayLog.add("box photo " + singer + ": " + unreachable.getClass().getSimpleName() + " " + unreachable.getMessage());
            }
        }
        Bitmap own = fromClubFolder(key);
        if (own != null) return own;
        File saved = new File(cacheFolder(), key + ".jpg");
        if (saved.exists()) return BitmapFactory.decodeFile(saved.getPath());
        synchronized (notFound) {
            if (notFound.contains(key)) return null;
        }
        Bitmap fetched = fromDeezer(singer, key, saved);
        if (fetched == null) synchronized (notFound) { notFound.add(key); }
        return fetched;
    }

    private Bitmap fromClubFolder(String key) {
        for (File root : files.roots()) {
            File[] pictures = new File(root, SINGERS_FOLDER).listFiles();
            if (pictures == null) continue;
            for (File picture : pictures) {
                String name = picture.getName().toLowerCase(Locale.ROOT);
                for (String ending : ENDINGS) {
                    if (name.endsWith(ending) && SongFiles.squash(name.substring(0, name.length() - ending.length())).equals(key)) return BitmapFactory.decodeFile(picture.getPath());
                }
            }
        }
        return null;
    }

    private File cacheFolder() {
        File folder = new File(context.getFilesDir(), "singer-photos");
        if (!folder.exists()) folder.mkdirs();
        return folder;
    }

    private Bitmap fromDeezer(String singer, String key, File saveTo) {
        try {
            JSONObject answer = new JSONObject(readText(SEARCH + URLEncoder.encode(singer, "UTF-8")));
            JSONArray results = answer.optJSONArray("data");
            if (results == null) return null;
            for (int i = 0; i < results.length(); i++) {
                JSONObject artist = results.optJSONObject(i);
                if (artist == null || !SongFiles.squash(artist.optString("name")).equals(key)) continue;
                String address = artist.optString("picture_medium");
                if (address.isEmpty()) continue;
                byte[] bytes = readBytes(address);
                Bitmap picture = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
                if (picture == null) return null;
                FileOutputStream out = new FileOutputStream(saveTo);
                out.write(bytes);
                out.close();
                return picture;
            }
        } catch (Exception unavailable) {
            OverlayLog.add("singer photo: " + unavailable.getClass().getSimpleName() + " " + unavailable.getMessage());
        }
        return null;
    }

    private static String readText(String address) throws Exception {
        return new String(readBytes(address), "UTF-8");
    }

    private static byte[] readBytes(String address) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(address).openConnection();
        try {
            connection.setConnectTimeout(TIMEOUT_MS);
            connection.setReadTimeout(TIMEOUT_MS);
            InputStream in = connection.getInputStream();
            ByteArrayOutputStream all = new ByteArrayOutputStream();
            byte[] chunk = new byte[8192];
            int read;
            while ((read = in.read(chunk)) > 0) {
                all.write(chunk, 0, read);
                if (all.size() > MAX_PICTURE_BYTES) throw new java.io.IOException("picture too big");
            }
            in.close();
            return all.toByteArray();
        } finally {
            connection.disconnect();
        }
    }
}
