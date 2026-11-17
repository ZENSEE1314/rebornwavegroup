package group.rebornwave.tvoverlay;

import java.util.ArrayDeque;

/** The last things the overlay did (screen found, window added or refused, page running), shown on the set-up page so a missing gift can be explained. */
final class OverlayLog {
    private static final int KEPT_LINES = 30;
    private static final int LINE_LENGTH = 140;
    private static final ArrayDeque<String> LINES = new ArrayDeque<String>();

    private OverlayLog() {}

    static void add(String line) {
        synchronized (LINES) {
            LINES.addLast(line.length() > LINE_LENGTH ? line.substring(0, LINE_LENGTH) : line);
            while (LINES.size() > KEPT_LINES) LINES.removeFirst();
        }
    }

    static String recent(int count) {
        synchronized (LINES) {
            StringBuilder text = new StringBuilder();
            int skip = Math.max(0, LINES.size() - count);
            int index = 0;
            for (String line : LINES) {
                if (index++ >= skip) text.append(line).append('\n');
            }
            return text.toString();
        }
    }
}
