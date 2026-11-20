package group.rebornwave.tvoverlay;

/** A song that can be chosen on the box's touch screen: its number (a video of the box "L...", or a YouTube video "yt:..."), title and singer. */
final class SongPick {
    final String code;
    final String title;
    final String artist;
    final boolean cloud; // kept in the cloud: the box downloads it when it is ordered, so it starts later

    SongPick(String code, String title, String artist) {
        this(code, title, artist, false);
    }

    SongPick(String code, String title, String artist, boolean cloud) {
        this.code = code;
        this.title = title;
        this.artist = artist;
        this.cloud = cloud;
    }

    boolean isYoutube() {
        return code.startsWith("yt:");
    }
}
