package group.rebornwave.tvoverlay;

/** A song that can be chosen on the box's touch screen: its number (a video of the box "L...", or a YouTube video "yt:..."), title and singer. */
final class SongPick {
    final String code;
    final String title;
    final String artist;

    SongPick(String code, String title, String artist) {
        this.code = code;
        this.title = title;
        this.artist = artist;
    }

    boolean isYoutube() {
        return code.startsWith("yt:");
    }
}
