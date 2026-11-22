package group.rebornwave.tvoverlay;

import android.content.Context;

import java.util.ArrayList;
import java.util.List;

/**
 * The songs the touch screen offers when the box's own program plays them: the box's song list (search by title, pinyin letters or singer), its singers
 * with their photos, the club's most requested songs, and the last songs of the box's list as "new songs". A song's number is the box's own number, so
 * a request carries what the box needs to play it. Every call reads the network: not for the screen's own thread.
 */
final class BoxServletCatalog implements ControlPanel.Catalog {
    // Most of the box's list is kept in the cloud and left out, so only a few songs of each 15-song page are on the box: read several pages.
    private static final int SEARCH_PAGES = 12;
    private static final int SINGER_PAGES = 8;
    private static final int SINGER_SONG_PAGES = 12;
    private static final long LIST_WAIT_MS = 45_000;
    private static final int NEW_PAGES = 8;    private static final int MAX_SONGS = 180;

    private final Context context;
    private final QueueClient client;
    private final SingerPhotos photos;
    private final SongFiles files;
    private volatile int hiddenCloud = 0; // cloud songs left out of the last list

    BoxServletCatalog(Context context, QueueClient client, SingerPhotos photos, SongFiles files) {
        this.files = files;
        this.context = context.getApplicationContext();
        this.client = client;
        this.photos = photos;
    }

    @Override
    public String source() {
        String address = BoxServlets.address();
        return Words.t("the box's own song system", "点歌机自带的点歌系统", "sistem lagu bawaan mesin") + (address.isEmpty() ? Words.t(" (not found yet)", "（尚未找到）", " (belum ditemukan)") : " (" + address + ")");
    }

    private String box() throws Exception {
        String base = BoxServlets.find(context);
        if (base.isEmpty()) throw new java.io.IOException("the box's song system was not found on this network");
        return base;
    }

    @Override
    public String whyEmpty() {
        if (!files.listProblem().isEmpty()) return Words.t("The song list could not be read: ", "无法读取歌曲列表：", "Daftar lagu tidak bisa dibaca: ") + files.listProblem();
        if (files.isListComing()) {
            return Words.t("The song list is still being read (" + files.listProgress() + ") — please search again in a minute.", "歌曲列表还在读取中（" + files.listProgress() + "），请一分钟后再搜索。", "Daftar lagu masih dibaca (" + files.listProgress() + ") — coba cari lagi satu menit lagi.");
        }
        return hiddenCloud > 0
                ? Words.t(hiddenCloud + " matching songs are cloud songs (kept in the cloud, not stored on this box). To list them too: ⚙ › Show cloud songs.",
                        "有 " + hiddenCloud + " 首匹配歌曲是云端歌曲（不在本机）。要显示：⚙ › 显示云端歌曲。",
                        hiddenCloud + " lagu cocok adalah lagu cloud (tidak tersimpan di mesin). Untuk menampilkannya: ⚙ › Tampilkan lagu cloud.")
                : "";
    }

    /**
     * The box's web search misses songs its own program has (新不了情), so the videos on this box, named from the box's own Songs.txt, are searched
     * first; the web search adds what they do not hold (cloud songs, when shown). A web search that fails does not hide the local answer.
     */
    @Override
    public List<SongPick> search(String text) throws Exception {
        files.refreshSoon();
        if (files.isListComing()) files.waitForList(LIST_WAIT_MS); // read at every start of the screen (about 15 s on the box): a search right after it opens waits
        if (files.isListComing()) return new ArrayList<SongPick>(); // still not ready: the screen says so (whyEmpty)
        List<SongPick> listed = fromList(text, false); // in memory after the first read: songs on this box first, then cloud songs
        if (!listed.isEmpty()) return listed; // the box's own list already holds its cloud songs: no slow web search needed
        return withoutRepeats(listed, text, "", SEARCH_PAGES);
    }

    @Override
    public List<String> singers(String text) throws Exception {
        files.refreshSoon();
        List<String> names = new ArrayList<String>();
        String wanted = SongFiles.squash(text);
        if (!wanted.isEmpty()) {
            for (SongFiles.LocalSong song : files.all()) {
                if (!song.artist.isEmpty() && SongFiles.squash(song.artist).contains(wanted) && !names.contains(song.artist)) names.add(song.artist);
            }
        }
        try {
            for (String name : boxSingers(text)) if (!names.contains(name)) names.add(name);
        } catch (Exception noBox) {
            if (names.isEmpty()) throw noBox;
        }
        return names;
    }

    private List<SongPick> withoutRepeats(List<SongPick> local, String text, String singer, int pages) throws Exception {
        List<SongPick> found = new ArrayList<SongPick>(local);
        java.util.Set<String> codes = new java.util.HashSet<String>();
        for (SongPick pick : local) codes.add(pick.code);
        try {
            for (SongPick pick : pagesOf(box(), text, singer, 1, pages)) if (codes.add(pick.code)) found.add(pick);
        } catch (Exception noBox) {
            if (found.isEmpty()) throw noBox;
            OverlayLog.add("touch: the box's web search failed: " + noBox.getMessage());
        }
        return found;
    }

    private List<String> boxSingers(String text) throws Exception {
        String base = box();
        List<String> names = new ArrayList<String>();
        for (int page = 1; page <= SINGER_PAGES; page++) {
            List<String[]> onPage = BoxServlets.singers(base, page, text);
            if (onPage.isEmpty()) break;
            for (String[] singer : onPage) {
                names.add(singer[0]);
                if (!singer[1].isEmpty()) photos.addBoxPhoto(singer[0], singer[1]);
            }
        }
        return names;
    }

    @Override
    public List<SongPick> songsOf(String singer) throws Exception {
        List<SongPick> own = new ArrayList<SongPick>();
        files.refreshSoon();
        for (SongFiles.LocalSong song : files.all()) if (song.artist.equals(singer)) own.add(new SongPick(song.code, song.title, song.artist));
        if (!own.isEmpty()) return own;
        List<SongPick> listed = fromList(singer, true);
        if (!listed.isEmpty()) return listed;
        return withoutRepeats(listed, "", singer, SINGER_SONG_PAGES);
    }

    /** The songs of the box's own list file; one without a video on this box is a cloud song (shown only when cloud songs are on). */
    private List<SongPick> fromList(String text, boolean bySinger) {
        files.refreshSoon();
        boolean showCloud = BridgeSettings.isShowCloud(context);
        List<SongPick> found = new ArrayList<SongPick>();
        int hidden = 0;
        for (String[] row : files.searchList(text, bySinger, MAX_SONGS)) {
            boolean onBox = files.hasVideo(row[0]);
            if (onBox || showCloud) found.add(new SongPick(row[0], row[1], row[2], !onBox));
            else hidden++;
        }
        hiddenCloud = hidden;
        return found;
    }

    @Override
    public List<SongPick> top() throws Exception {
        return client.topSongs();
    }

    /** The songs at the very end of the box's list, newest first: the box lists songs in the order they were added (a best guess; the box has no "new" button). */
    @Override
    public List<SongPick> fresh() throws Exception {
        String base = box();
        int last = BoxServlets.songPages(base);
        List<SongPick> newest = new ArrayList<SongPick>();
        for (int page = last; page > Math.max(0, last - NEW_PAGES) && newest.size() < MAX_SONGS; page--) {
            newest.addAll(BoxServlets.reversed(BoxServlets.search(base, "", "", page, BridgeSettings.isShowCloud(context)).songs));
        }
        return newest;
    }

    /** Reads pages one after the other until enough songs are found or the list ends. */
    private List<SongPick> pagesOf(String base, String text, String singer, int firstPage, int pages) throws Exception {
        List<SongPick> found = new ArrayList<SongPick>();
        boolean includeCloud = BridgeSettings.isShowCloud(context);
        int hidden = 0;
        for (int page = firstPage; page < firstPage + pages && found.size() < MAX_SONGS; page++) {
            BoxServlets.Page onPage = BoxServlets.search(base, text, singer, page, includeCloud);
            found.addAll(onPage.songs);
            hidden += onPage.cloudHidden;
            if (onPage.isLast()) break;
        }
        hiddenCloud = hidden;
        return found;
    }
}
