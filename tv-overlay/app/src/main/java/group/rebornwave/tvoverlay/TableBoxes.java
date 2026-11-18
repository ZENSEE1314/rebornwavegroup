package group.rebornwave.tvoverlay;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Sorts the queue into one list of songs per table, the table that sings first coming first: what each box of the lobby shows. */
final class TableBoxes {
    private static final String NO_TABLE = "—";

    private TableBoxes() {}

    /** The song on now first (so its table leads), then the waiting songs in queue order; at most `maxTables` tables, every song of a shown table kept. */
    static List<List<QueueClient.Song>> group(QueueClient.Song now, List<QueueClient.Song> waiting, int maxTables) {
        Map<String, List<QueueClient.Song>> byTable = new LinkedHashMap<String, List<QueueClient.Song>>();
        if (now != null) add(byTable, now);
        for (QueueClient.Song song : waiting) add(byTable, song);
        List<List<QueueClient.Song>> tables = new ArrayList<List<QueueClient.Song>>(byTable.values());
        return tables.size() > maxTables ? new ArrayList<List<QueueClient.Song>>(tables.subList(0, maxTables)) : tables;
    }

    /** "Table 3", or the singer's name when the song has no table. */
    static String label(QueueClient.Song song) {
        return song.table.isEmpty() ? (song.name.isEmpty() ? NO_TABLE : song.name) : Words.t("Table ", "桌 ", "Meja ") + song.table;
    }

    private static void add(Map<String, List<QueueClient.Song>> byTable, QueueClient.Song song) {
        String key = label(song);
        List<QueueClient.Song> songs = byTable.get(key);
        if (songs == null) {
            songs = new ArrayList<QueueClient.Song>();
            byTable.put(key, songs);
        }
        songs.add(song);
    }
}
