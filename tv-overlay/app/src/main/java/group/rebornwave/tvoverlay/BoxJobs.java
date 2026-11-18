package group.rebornwave.tvoverlay;

import android.content.Context;
import android.util.Base64;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.List;

/**
 * Answers what members ask the box through the app (a search, the singers, one singer's songs, a singer's photo) from the box's own song system, in the
 * form the app expects. Song numbers are the box's own, so a request carries what the box needs to play it.
 */
final class BoxJobs {
    private static final int SEARCH_PAGES = 4;
    private static final int MAX_SONGS = 40;

    private final Context context;

    BoxJobs(Context context) {
        this.context = context.getApplicationContext();
    }

    JSONObject answer(QueueClient.Job job) throws Exception {
        String box = BoxServlets.find(context);
        if (box.isEmpty()) throw new java.io.IOException("the box's song system was not found");
        if ("singers".equals(job.kind)) return singers(box, job.page);
        if ("singer".equals(job.kind)) return singerSongs(box, job.name, job.page);
        if ("photo".equals(job.kind)) return photo(box, job.file);
        return search(box, job);
    }

    private JSONObject search(String box, QueueClient.Job job) throws Exception {
        boolean includeCloud = BridgeSettings.isShowCloud(context);
        JSONArray songs = new JSONArray();
        List<String> texts = new java.util.ArrayList<String>();
        texts.add(job.q);
        texts.addAll(job.queries);
        for (String text : texts) {
            if (text.trim().isEmpty()) continue;
            for (int page = 1; page <= SEARCH_PAGES && songs.length() < MAX_SONGS; page++) {
                BoxServlets.Page found = BoxServlets.search(box, text, "", page, includeCloud);
                for (SongPick pick : found.songs) songs.put(view(pick));
                if (found.isLast()) break;
            }
            if (songs.length() > 0) break;
        }
        return new JSONObject().put("songs", songs).put("maxPage", 1);
    }

    private JSONObject singers(String box, int page) throws Exception {
        BoxServlets.SingerPage found = BoxServlets.singersPage(box, page);
        JSONArray list = new JSONArray();
        for (String[] singer : found.singers) {
            String address = singer[1];
            String file = address.isEmpty() ? "" : address.substring(address.lastIndexOf('/') + 1);
            list.put(new JSONObject().put("name", singer[0]).put("pinyin", "").put("photo", file).put("songs", 0));
        }
        return new JSONObject().put("singers", list).put("maxPage", found.maxPage);
    }

    private JSONObject singerSongs(String box, String singer, int page) throws Exception {
        BoxServlets.Page found = BoxServlets.search(box, "", singer, page, BridgeSettings.isShowCloud(context));
        JSONArray songs = new JSONArray();
        for (SongPick pick : found.songs) songs.put(view(pick));
        return new JSONObject().put("songs", songs).put("maxPage", found.isLast() ? page : page + 1);
    }

    /** A singer's photo as the app wants it: the picture in base64 and its type (empty when the box has none). */
    private JSONObject photo(String box, String file) throws Exception {
        byte[] bytes = file.isEmpty() ? null : BoxServlets.photo(box, file);
        if (bytes == null) return new JSONObject().put("data", "").put("type", "");
        return new JSONObject().put("data", Base64.encodeToString(bytes, Base64.NO_WRAP)).put("type", file.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg");
    }

    private static JSONObject view(SongPick pick) throws Exception {
        return new JSONObject().put("code", pick.code).put("title", pick.title).put("artist", pick.artist).put("photo", "");
    }
}
