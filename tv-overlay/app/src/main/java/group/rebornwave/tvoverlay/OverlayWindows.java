package group.rebornwave.tvoverlay;

import android.content.Context;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.hardware.display.DisplayManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.Display;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.TextView;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * What is drawn over everything on each wanted screen of this box (see Screens): the main screen, the HDMI / TV screen, or both. A window belongs
 * to one screen, so each screen gets its own. The gifts and the song bar are plain Android views (GiftView) fed straight from the app (TvFeed),
 * not a web page, so an old browser on the box cannot get in the way. The windows cannot be touched or focused, so the karaoke program keeps
 * working underneath. Plugging in or taking out the HDMI cable is noticed and the windows follow.
 */
final class OverlayWindows {
    private static final String TAG = "RebornOverlay";
    private static final float OPAQUE = 1f;
    private static final int BANNER_HEIGHT_PX = 220;
    // WindowManager.LayoutParams.TYPE_PRESENTATION: hidden from the public SDK, but a fixed value (FIRST_SYSTEM_WINDOW + 37) that Android has used since 4.2.
    private static final int TYPE_PRESENTATION = 2037;

    private static final class Layer {
        final WindowManager windows;
        final GiftView view;

        Layer(WindowManager windows, GiftView view) {
            this.windows = windows;
            this.view = view;
        }
    }

    private final Context service;
    private final int windowType;
    private final float alpha;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Map<Integer, Layer> layers = new HashMap<Integer, Layer>();
    private String path = "";
    private String bar = "";
    private boolean listening = false;

    private final DisplayManager.DisplayListener screensChanged = new DisplayManager.DisplayListener() {
        @Override public void onDisplayAdded(int displayId) { followScreens(); }
        @Override public void onDisplayRemoved(int displayId) { followScreens(); }
        @Override public void onDisplayChanged(int displayId) { }
    };

    private final TvFeed feed;

    /** `alpha` below 1 only where Android 12+ would otherwise drop taps that pass through the window (see OverlayService). */
    OverlayWindows(Context service, int windowType, float alpha) {
        this.service = service;
        this.windowType = windowType;
        this.alpha = alpha;
        this.feed = new TvFeed(service, handler, new TvFeed.Listener() {
            @Override public void onGift(TvFeed.Gift gift) {
                for (Layer layer : layers.values()) layer.view.play(gift);
            }

            @Override public void onBar(String text) {
                bar = text;
                for (Layer layer : layers.values()) layer.view.setBar(text);
            }
        });
    }

    boolean isShowing() {
        return !layers.isEmpty();
    }

    /** Draws on every wanted screen and stops drawing on the others; call again after the link, the choice or the cable changed. `tvPath` is the linked TV screen, like /tv/TOKEN. */
    void show(String tvPath) {
        if (!listening) {
            ((DisplayManager) service.getSystemService(Context.DISPLAY_SERVICE)).registerDisplayListener(screensChanged, handler);
            listening = true;
        }
        if (!tvPath.equals(path)) {
            path = tvPath;
            feed.start(tvPath);
        }
        List<Display> wanted = Screens.wanted(service);
        Set<Integer> wantedIds = new HashSet<Integer>();
        for (Display display : wanted) wantedIds.add(display.getDisplayId());
        for (Integer id : new ArrayList<Integer>(layers.keySet())) if (!wantedIds.contains(id)) remove(id);
        for (Display display : wanted) if (!layers.containsKey(display.getDisplayId())) add(display);
    }

    void hide() {
        if (listening) {
            ((DisplayManager) service.getSystemService(Context.DISPLAY_SERVICE)).unregisterDisplayListener(screensChanged);
            listening = false;
        }
        feed.stop();
        handler.removeCallbacksAndMessages(null);
        for (Integer id : new ArrayList<Integer>(layers.keySet())) remove(id);
        path = "";
        bar = "";
    }

    private void followScreens() {
        if (!path.isEmpty()) show(path);
    }

    /**
     * The window type for a screen. The main screen uses the type of the service (an accessibility overlay needs the service's own token, which only
     * the main screen's window manager carries); another screen (the HDMI / TV) uses a presentation window, which Android allows to any app with
     * no permission and no token, and which sits above the windows of the karaoke program.
     */
    private int typeFor(Display display) {
        return display.getDisplayId() == Display.DEFAULT_DISPLAY ? windowType : TYPE_PRESENTATION;
    }

    /** The context a window of this screen needs: another screen's windows come from a context made for that screen. */
    private Context contextFor(Display display) {
        if (display.getDisplayId() == Display.DEFAULT_DISPLAY) return service;
        Context ofScreen = service.createDisplayContext(display);
        if (Build.VERSION.SDK_INT >= 30) {
            try {
                return ofScreen.createWindowContext(TYPE_PRESENTATION, null);
            } catch (RuntimeException unsupported) {
                OverlayLog.add("screen " + display.getDisplayId() + ": no window context for it, using the plain one");
            }
        }
        return ofScreen;
    }

    private WindowManager.LayoutParams paramsFor(Display display, int height) {
        int flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
                | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS;
        WindowManager.LayoutParams params = new WindowManager.LayoutParams(WindowManager.LayoutParams.MATCH_PARENT, height, typeFor(display), flags, PixelFormat.TRANSLUCENT);
        if (alpha < OPAQUE) params.alpha = alpha;
        return params;
    }

    /** Shows a plain red banner with this text on every wanted screen for a few seconds: tells whether windows can be drawn over the karaoke picture at all. */
    void banner(String text, long millis) {
        for (Display display : Screens.wanted(service)) {
            final int id = display.getDisplayId();
            try {
                Context context = contextFor(display);
                final TextView view = new TextView(context);
                view.setText(text);
                view.setTextSize(40);
                view.setTextColor(Color.WHITE);
                view.setBackgroundColor(Color.argb(200, 200, 0, 0));
                view.setGravity(Gravity.CENTER);
                final WindowManager manager = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
                WindowManager.LayoutParams params = paramsFor(display, BANNER_HEIGHT_PX);
                params.gravity = Gravity.TOP;
                manager.addView(view, params);
                OverlayLog.add("screen " + id + ": test banner shown");
                handler.postDelayed(new Runnable() {
                    @Override public void run() {
                        try { manager.removeView(view); } catch (RuntimeException gone) { /* already removed */ }
                    }
                }, millis);
            } catch (RuntimeException refused) {
                OverlayLog.add("screen " + id + ": test banner refused: " + refused.getClass().getSimpleName() + " " + refused.getMessage());
            }
        }
    }

    /** Plays a made-up gift on every screen, with no server: shows that the drawing itself works on this box. */
    void testGift() {
        TvFeed.Gift gift = new TvFeed.Gift();
        gift.id = "test";
        gift.name = Words.t("Test rose", "测试玫瑰", "Mawar tes");
        gift.emoji = "🌹";
        gift.fromName = "Alex";
        gift.fromTable = "5";
        gift.toName = "Sam";
        gift.toTable = "9";
        gift.kgold = 1000;
        for (Layer layer : layers.values()) layer.view.play(gift);
        OverlayLog.add("test: gift played on " + layers.size() + " screen(s)");
    }

    private void add(Display display) {
        final int id = display.getDisplayId();
        Context context;
        GiftView view;
        try {
            context = contextFor(display);
            view = new GiftView(context);
        } catch (RuntimeException refused) {
            OverlayLog.add("screen " + id + ": could not start: " + refused.getClass().getSimpleName() + " " + refused.getMessage());
            return;
        }
        WindowManager windows = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
        try {
            windows.addView(view, paramsFor(display, WindowManager.LayoutParams.MATCH_PARENT));
        } catch (RuntimeException refused) {
            Log.w(TAG, "screen " + id + " would not take the overlay: " + refused);
            OverlayLog.add("screen " + id + ": window refused: " + refused.getClass().getSimpleName() + " " + refused.getMessage());
            view.close();
            return;
        }
        OverlayLog.add("screen " + id + ": window added");
        view.setBar(bar);
        layers.put(id, new Layer(windows, view));
    }

    private void remove(int id) {
        Layer layer = layers.remove(id);
        if (layer == null) return;
        layer.view.close();
        try { layer.windows.removeView(layer.view); } catch (RuntimeException gone) { /* the screen went away with its window */ }
    }
}
