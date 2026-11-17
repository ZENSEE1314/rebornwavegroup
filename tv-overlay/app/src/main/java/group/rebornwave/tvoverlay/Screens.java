package group.rebornwave.tvoverlay;

import android.content.Context;
import android.graphics.Point;
import android.hardware.display.DisplayManager;
import android.view.Display;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Which screens of this box show the gifts. A karaoke box usually has its own touch screen (the main screen) and an HDMI output to the TV
 * (a second screen to Android): the guests watch the TV, so by default the gifts go to the HDMI / TV screen, and to the main screen only when
 * the box has no second one.
 */
final class Screens {
    static final String EXTERNAL = "external";
    static final String MAIN = "main";
    static final String BOTH = "both";

    private Screens() {}

    /** The screens to draw on now, by the saved choice. */
    static List<Display> wanted(Context context) {
        Display main = null;
        List<Display> others = new ArrayList<Display>();
        for (Display display : displays(context)) {
            if (display.getDisplayId() == Display.DEFAULT_DISPLAY) main = display;
            else others.add(display);
        }
        String choice = Link.screens(context);
        List<Display> picked = new ArrayList<Display>();
        if (Screens.MAIN.equals(choice)) {
            if (main != null) picked.add(main);
        } else if (Screens.BOTH.equals(choice)) {
            if (main != null) picked.add(main);
            picked.addAll(others);
        } else if (others.isEmpty()) {
            if (main != null) picked.add(main); // no HDMI / TV screen on this box: the main screen is all there is
        } else {
            picked.addAll(others);
        }
        return picked;
    }

    /** What Android knows about the screens of this box, one line each, to show on the set-up page. */
    static String describe(Context context) {
        StringBuilder text = new StringBuilder();
        for (Display display : displays(context)) {
            Point size = new Point();
            display.getRealSize(size);
            text.append("#").append(display.getDisplayId()).append(" ").append(display.getName()).append(" ").append(size.x).append("x").append(size.y)
                    .append(display.getDisplayId() == Display.DEFAULT_DISPLAY ? " (main)" : "").append('\n');
        }
        return text.toString();
    }

    /** Every screen an app may draw on (private screens of other apps are left out). */
    private static List<Display> displays(Context context) {
        DisplayManager manager = (DisplayManager) context.getSystemService(Context.DISPLAY_SERVICE);
        if (manager == null) return Collections.emptyList();
        List<Display> usable = new ArrayList<Display>();
        for (Display display : manager.getDisplays()) {
            if ((display.getFlags() & Display.FLAG_PRIVATE) == 0) usable.add(display);
        }
        return usable;
    }
}
