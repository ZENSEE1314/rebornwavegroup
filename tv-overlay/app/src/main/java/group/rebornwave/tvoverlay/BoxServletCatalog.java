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
    private static final int SEARCH_PAGES = 6;
    private static final int SINGER_PAGES = 8;
    private static final int SINGER_SONG_PAGES = 8;
    private static final int NEW_PAGES = 8;
    private static final int MAX_SONGS = 60;

    private final Context context;
    private final QueueClient client;
    private final SingerPhotos photos;

    BoxServletCatalog(Context context, QueueClient client, SingerPhotos photos) {
        this.context = context.getApplicationContext();
        this.client = client;
        this.photos = photos;
    }

    private String box() throws Exception {
        String base = BoxServlets.find(context);
        if (base.isEmpty()) throw new java.io.IOException("the box's song system was not found on this network");
        return base;
    }

    @Override
    public List<SongPick> search(String text) throws Exception {
        return pagesOf(box(), text, "", 1, SEARCH_PAGES);
    }

    @Override
    public List<String> singers() throws Exception {
        String base = box();
        List<String> names = new ArrayList<String>();
        for (int page = 1; page <= SINGER_PAGES; page++) {
            List<String[]> onPage = BoxServlets.singers(base, page);
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
            newest.addAll(BoxServlets.reversed(BoxServlets.search(base, "", "", page).songs));
        }
        return newest;
    }

    /** Reads pages one after the other until enough songs are found or the list ends. */
    private static List<SongPick> pagesOf(String base, String text, String singer, int firstPage, int pages) throws Exception {
        List<SongPick> found = new ArrayList<SongPick>();
        for (int page = firstPage; page < firstPage + pages && found.size() < MAX_SONGS; page++) {
            BoxServlets.Page onPage = BoxServlets.search(base, text, singer, page);
            found.addAll(onPage.songs);
            if (onPage.isLast()) break;
        }
        return found;
    }
}
