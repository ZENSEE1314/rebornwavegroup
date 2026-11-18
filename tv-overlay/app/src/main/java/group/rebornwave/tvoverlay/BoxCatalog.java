package group.rebornwave.tvoverlay;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * The songs the touch screen can offer, by the four ways of choosing: singers, song title, top songs, new songs. Songs are the videos on this box
 * and, for a title search and the top list, YouTube karaoke videos the app knows. Every call reads files or the network: not for the screen's own thread.
 */
final class BoxCatalog implements ControlPanel.Catalog {
    private static final int LIST_LIMIT = 60;
    private static final int MIN_SEARCH_LENGTH = 2;

    private final SongFiles files;
    private final QueueClient client;

    BoxCatalog(SongFiles files, QueueClient client) {
        this.files = files;
        this.client = client;
    }

    @Override
    public String source() {
        return Words.t("videos in the Karaoke folder of this box (" + files.count() + " found; put them in " + files.foldersText().split("\n")[0] + ")",
                "本机 Karaoke 文件夹里的视频（找到 " + files.count() + " 个）",
                "video di folder Karaoke perangkat ini (" + files.count() + " ditemukan)");
    }

    @Override
    public List<SongPick> search(String text) throws Exception {
        files.refreshIfOld();
        List<SongPick> found = new ArrayList<SongPick>();
        String wanted = SongFiles.squash(text);
        if (wanted.length() < MIN_SEARCH_LENGTH) return found;
        for (SongFiles.LocalSong song : files.all()) {
            if (found.size() >= LIST_LIMIT) break;
            if (song.key.contains(wanted)) found.add(pickOf(song));
        }
        try {
            found.addAll(client.youtube(text));
        } catch (Exception noYoutube) {
            OverlayLog.add("touch: YouTube search failed: " + noYoutube.getMessage());
        }
        return found;
    }

    @Override
    public List<String> singers() {
        files.refreshIfOld();
        final Map<String, Integer> counts = new HashMap<String, Integer>();
        for (SongFiles.LocalSong song : files.all()) {
            if (song.artist.isEmpty()) continue;
            Integer have = counts.get(song.artist);
            counts.put(song.artist, have == null ? 1 : have + 1);
        }
        List<String> names = new ArrayList<String>(counts.keySet());
        Collections.sort(names, new Comparator<String>() {
            @Override public int compare(String a, String b) { return counts.get(b) - counts.get(a); }
        });
        return names;
    }

    @Override
    public List<SongPick> songsOf(String singer) {
        files.refreshIfOld();
        List<SongPick> own = new ArrayList<SongPick>();
        for (SongFiles.LocalSong song : files.all()) if (song.artist.equals(singer)) own.add(pickOf(song));
        return own;
    }

    @Override
    public List<SongPick> top() throws Exception {
        files.refreshIfOld();
        List<SongPick> playable = new ArrayList<SongPick>();
        for (SongPick pick : client.topSongs()) {
            if (playable.size() >= LIST_LIMIT) break;
            if (pick.isYoutube() || files.byCode(pick.code) != null) playable.add(pick);
        }
        return playable;
    }

    @Override
    public List<SongPick> fresh() {
        files.refreshIfOld();
        List<SongFiles.LocalSong> newest = new ArrayList<SongFiles.LocalSong>(files.all());
        Collections.sort(newest, new Comparator<SongFiles.LocalSong>() {
            @Override public int compare(SongFiles.LocalSong a, SongFiles.LocalSong b) { return Long.compare(b.file.lastModified(), a.file.lastModified()); }
        });
        List<SongPick> picks = new ArrayList<SongPick>();
        for (int i = 0; i < Math.min(LIST_LIMIT, newest.size()); i++) picks.add(pickOf(newest.get(i)));
        return picks;
    }

    private static SongPick pickOf(SongFiles.LocalSong song) {
        return new SongPick(song.code, song.title, song.artist);
    }
}
