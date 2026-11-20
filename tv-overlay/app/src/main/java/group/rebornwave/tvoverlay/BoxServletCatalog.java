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
    private static final int NEW_PAGES = 8;
    private static final int DOWNLOADED_PAGES = 60;
    private static final int MAX_SONGS = 180;

    private final Context context;
    private final QueueClient client;
    private final SingerPhotos photos;
    private volatile int hiddenCloud = 0; // cloud songs left out of the last list

    BoxServletCatalog(Context context, QueueClient client, SingerPhotos photos) {
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
        return hiddenCloud > 0
                ? Words.t(hiddenCloud + " matching songs are cloud songs (kept in the cloud, not stored on this box). To list them too: ⚙ › Show cloud songs.",
                        "有 " + hiddenCloud + " 首匹配歌曲是云端歌曲（不在本机）。要显示：⚙ › 显示云端歌曲。",
                        hiddenCloud + " lagu cocok adalah lagu cloud (tidak tersimpan di mesin). Untuk menampilkannya: ⚙ › Tampilkan lagu cloud.")
                : "";
    }

    @Override
    public List<SongPick> search(String text) throws Exception {
        return pagesOf(box(), text, "", 1, SEARCH_PAGES);
    }

    @Override
    public List<String> singers(String text) throws Exception {
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
        return pagesOf(box(), "", singer, 1, SINGER_SONG_PAGES);
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

    /** The songs stored on the box itself: the list is read page after page and only the songs that are not cloud songs are kept (about one in five). */
    @Override
    public List<SongPick> downloaded() throws Exception {
        String base = box();
        List<SongPick> stored = new ArrayList<SongPick>();
        for (int page = 1; page <= DOWNLOADED_PAGES && stored.size() < MAX_SONGS; page++) {
            BoxServlets.Page onPage = BoxServlets.search(base, "", "", page, false);
            stored.addAll(onPage.songs);
            if (onPage.isLast()) break;
        }
        return stored;
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
