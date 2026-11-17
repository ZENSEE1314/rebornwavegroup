package group.rebornwave.tvoverlay;

import android.accessibilityservice.AccessibilityService;
import android.content.ComponentName;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.WindowManager;
import android.view.accessibility.AccessibilityEvent;

/**
 * The other way to draw the gifts over the karaoke picture, for boxes that hide "Display over other apps": an accessibility service may add
 * windows of its own kind (TYPE_ACCESSIBILITY_OVERLAY) without that permission. It reads nothing from the screen; it only keeps the see-through
 * page of the linked TV screen on top of the wanted screens (HDMI / TV and / or main, see Screens), and takes it away when the box is unlinked.
 */
public class OverlayAccessibilityService extends AccessibilityService {
    static volatile boolean running = false;
    static volatile OverlayWindows windowsNow;

    private static final long CHECK_MS = 2000;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private OverlayWindows windows;

    private final Runnable check = new Runnable() {
        @Override
        public void run() {
            sync();
            handler.postDelayed(this, CHECK_MS);
        }
    };

    static boolean isEnabled(Context context) {
        String enabled = Settings.Secure.getString(context.getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
        if (enabled == null) return false;
        String mine = new ComponentName(context, OverlayAccessibilityService.class).flattenToString();
        return enabled.contains(mine) || enabled.contains(new ComponentName(context, OverlayAccessibilityService.class).flattenToShortString());
    }

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        windows = new OverlayWindows(this, WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY, 1f);
        windowsNow = windows;
        running = true;
        handler.post(check);
    }

    /** Shows the page when this box is linked, takes it away when it is not; it also follows a changed link or a changed choice of screens. */
    private void sync() {
        if (windows == null) return;
        if (Link.isLinked(this)) windows.show(Link.pageUrl(this));
        else if (windows.isShowing()) windows.hide();
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        // Nothing is read from the screen.
    }

    @Override
    public void onInterrupt() {
    }

    @Override
    public void onDestroy() {
        running = false;
        windowsNow = null;
        handler.removeCallbacksAndMessages(null);
        if (windows != null) {
            windows.hide();
            windows = null;
        }
        super.onDestroy();
    }
}
