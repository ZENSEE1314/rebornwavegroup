package group.rebornwave.tvoverlay;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

/** The song numbers chosen on this touch screen that the box keeps in the cloud: the box downloads them when they are ordered, so they start later. */
final class CloudMarks {
    private static final Set<String> CODES = Collections.synchronizedSet(new HashSet<String>());

    private CloudMarks() {}

    static void add(String code) {
        if (code != null && !code.isEmpty()) CODES.add(code);
    }

    static boolean has(String code) {
        return code != null && CODES.contains(code);
    }
}
