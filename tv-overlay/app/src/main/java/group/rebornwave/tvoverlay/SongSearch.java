package group.rebornwave.tvoverlay;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Answers what members ask the box through the app (the same questions the old song-system bridge answered): a search, the list of singers, one
 * singer's songs. The songs are the videos on this box (SongFiles); the numbers in the answers are the songs' own numbers, which a request then carries.
 */
final class SongSearch {
    private static final int SEARCH_LIMIT = 50; // the app keeps at most 60 songs of an answer
    private static final int SINGERS_PER_PAGE = 24;
    private static final int SONGS_PER_PAGE = 30;

    private final SongFiles files;

    SongSearch(SongFiles files) {
        this.files = files;
    }

    /** The answer to a job from the app: { songs } / { singers, maxPage } / { data, type } (no photos). */
    JSONObject answer(QueueClient.Job job) throws Exception {
        files.refreshIfOld();
        if ("singers".equals(job.kind)) return singers(job.q, job.page);
        if ("singer".equals(job.kind)) return songsOf(job.name, job.page);
        if ("photo".equals(job.kind)) return new JSONObject().put("data", "").put("type", "");
        return search(job);
    }

    private JSONObject search(QueueClient.Job job) throws Exception {
        List<String> wanted = new ArrayList<String>();
        wanted.add(SongFiles.squash(job.q));
        for (String variant : job.queries) wanted.add(SongFiles.squash(variant));
        JSONArray found = new JSONArray();
        for (SongFiles.LocalSong song : files.all()) {
            if (found.length() >= SEARCH_LIMIT) break;
            if (matches(song, wanted)) found.put(view(song));
        }
        return new JSONObject().put("songs", found).put("maxPage", 1);
    }

    private static boolean matches(SongFiles.LocalSong song, List<String> wanted) {
        for (String text : wanted) if (text.length() > 0 && song.key.contains(text)) return true;
        return false;
    }

    private JSONObject singers(String query, int page) throws Exception {
        Map<String, Integer> counts = new LinkedHashMap<String, Integer>();
        String wanted = SongFiles.squash(query);
        for (SongFiles.LocalSong song : files.all()) {
            if (song.artist.isEmpty() || (!wanted.isEmpty() && !SongFiles.squash(song.artist).contains(wanted))) continue;
            Integer have = counts.get(song.artist);
            counts.put(song.artist, have == null ? 1 : have + 1);
        }
        List<Map.Entry<String, Integer>> sorted = new ArrayList<Map.Entry<String, Integer>>(counts.entrySet());
        java.util.Collections.sort(sorted, new java.util.Comparator<Map.Entry<String, Integer>>() {
            @Override public int compare(Map.Entry<String, Integer> a, Map.Entry<String, Integer> b) { return b.getValue() - a.getValue(); }
        });
        JSONArray list = new JSONArray();
        int from = (Math.max(1, page) - 1) * SINGERS_PER_PAGE;
        for (int i = from; i < Math.min(sorted.size(), from + SINGERS_PER_PAGE); i++) {
            list.put(new JSONObject().put("name", sorted.get(i).getKey()).put("pinyin", "").put("photo", "").put("songs", sorted.get(i).getValue()));
        }
        return new JSONObject().put("singers", list).put("maxPage", Math.max(1, (sorted.size() + SINGERS_PER_PAGE - 1) / SINGERS_PER_PAGE));
    }

    private JSONObject songsOf(String singer, int page) throws Exception {
        List<SongFiles.LocalSong> own = new ArrayList<SongFiles.LocalSong>();
        for (SongFiles.LocalSong song : files.all()) if (song.artist.equals(singer)) own.add(song);
        JSONArray list = new JSONArray();
        int from = (Math.max(1, page) - 1) * SONGS_PER_PAGE;
        for (int i = from; i < Math.min(own.size(), from + SONGS_PER_PAGE); i++) list.put(view(own.get(i)));
        return new JSONObject().put("songs", list).put("maxPage", Math.max(1, (own.size() + SONGS_PER_PAGE - 1) / SONGS_PER_PAGE));
    }

    private static JSONObject view(SongFiles.LocalSong song) throws Exception {
        return new JSONObject().put("code", song.code).put("title", song.title).put("artist", song.artist).put("photo", "");
    }
}
