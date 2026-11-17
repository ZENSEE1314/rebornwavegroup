package group.rebornwave.tvoverlay;

import android.content.Context;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.hardware.display.DisplayManager;
import android.net.http.SslError;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.Display;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.SslErrorHandler;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.TextView;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * The see-through page of the linked TV screen, drawn over everything on each wanted screen of this box (see Screens): the main screen, the
 * HDMI / TV screen, or both. A window belongs to one screen, so each screen gets its own page. The windows cannot be touched or focused, so the
 * karaoke program keeps working underneath. Plugging in or taking out the HDMI cable is noticed and the page follows.
 */
final class OverlayWindows {
    private static final String TAG = "RebornOverlay";
    private static final long RELOAD_AFTER_MS = 10_000;
    private static final float OPAQUE = 1f;
    private static final int BANNER_HEIGHT_PX = 220;

    private static final class Layer {
        final WindowManager windows;
        final WebView web;
        String shownUrl = "";

        Layer(WindowManager windows, WebView web) {
            this.windows = windows;
            this.web = web;
        }
    }

    private final Context service;
    private final int windowType;
    private final float alpha;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Map<Integer, Layer> layers = new HashMap<Integer, Layer>();
    private String url = "";
    private boolean listening = false;

    private final DisplayManager.DisplayListener screensChanged = new DisplayManager.DisplayListener() {
        @Override public void onDisplayAdded(int displayId) { followScreens(); }
        @Override public void onDisplayRemoved(int displayId) { followScreens(); }
        @Override public void onDisplayChanged(int displayId) { }
    };

    /** `alpha` below 1 only where Android 12+ would otherwise drop taps that pass through the window (see OverlayService). */
    OverlayWindows(Context service, int windowType, float alpha) {
        this.service = service;
        this.windowType = windowType;
        this.alpha = alpha;
    }

    boolean isShowing() {
        return !layers.isEmpty();
    }

    /** Puts the page on every wanted screen and takes it off the others; call again after the link, the choice or the cable changed. */
    void show(String pageUrl) {
        url = pageUrl;
        if (!listening) {
            ((DisplayManager) service.getSystemService(Context.DISPLAY_SERVICE)).registerDisplayListener(screensChanged, handler);
            listening = true;
        }
        List<Display> wanted = Screens.wanted(service);
        Set<Integer> wantedIds = new HashSet<Integer>();
        for (Display display : wanted) wantedIds.add(display.getDisplayId());
        for (Integer id : new ArrayList<Integer>(layers.keySet())) if (!wantedIds.contains(id)) remove(id);
        for (Display display : wanted) {
            Layer layer = layers.get(display.getDisplayId());
            if (layer == null) add(display);
            else if (!pageUrl.equals(layer.shownUrl)) { layer.shownUrl = pageUrl; layer.web.loadUrl(pageUrl); }
        }
    }

    void hide() {
        if (listening) {
            ((DisplayManager) service.getSystemService(Context.DISPLAY_SERVICE)).unregisterDisplayListener(screensChanged);
            listening = false;
        }
        handler.removeCallbacksAndMessages(null);
        for (Integer id : new ArrayList<Integer>(layers.keySet())) remove(id);
        url = "";
    }

    private void followScreens() {
        if (!url.isEmpty()) show(url);
    }

    /**
     * The window type for a screen. The main screen uses the type of the service (an accessibility overlay needs the service's own token, which only
     * the main screen's window manager carries); another screen (the HDMI / TV) uses a presentation window, which Android allows to any app with
     * no permission and no token, and which sits above the windows of the karaoke program.
     */
    private int typeFor(Display display) {
        return display.getDisplayId() == Display.DEFAULT_DISPLAY ? windowType : WindowManager.LayoutParams.TYPE_PRESENTATION;
    }

    /** The context a window of this screen needs: another screen's windows come from a context made for that screen. */
    private Context contextFor(Display display) {
        if (display.getDisplayId() == Display.DEFAULT_DISPLAY) return service;
        Context ofScreen = service.createDisplayContext(display);
        if (Build.VERSION.SDK_INT >= 30) {
            try {
                return ofScreen.createWindowContext(WindowManager.LayoutParams.TYPE_PRESENTATION, null);
            } catch (RuntimeException unsupported) {
                OverlayLog.add("screen " + display.getDisplayId() + ": no window context for it, using the plain one");
            }
        }
        return ofScreen;
    }

    /** Shows a plain red banner with this text on every wanted screen for a few seconds: tells whether windows can be drawn over the karaoke picture at all, whatever the page does. */
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
                int flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
                        | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS;
                WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                        WindowManager.LayoutParams.MATCH_PARENT, BANNER_HEIGHT_PX, typeFor(display), flags, PixelFormat.TRANSLUCENT);
                params.gravity = Gravity.TOP;
                if (alpha < OPAQUE) params.alpha = alpha;
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

    private void add(Display display) {
        final int id = display.getDisplayId();
        final Context context;
        final WebView web;
        try {
            context = contextFor(display);
            web = new WebView(context);
        } catch (RuntimeException refused) {
            OverlayLog.add("screen " + id + ": could not start a page: " + refused.getClass().getSimpleName() + " " + refused.getMessage());
            return;
        }
        web.setBackgroundColor(Color.TRANSPARENT);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setMediaPlaybackRequiresUserGesture(false);
        // Hidden until the page itself says it runs (RebornOverlay.ready()): a page that cannot load or run on this box never covers the picture.
        web.setVisibility(View.INVISIBLE);
        web.addJavascriptInterface(new Object() {
            @JavascriptInterface
            public void ready() {
                OverlayLog.add("screen " + id + ": the page is running");
                handler.post(new Runnable() { @Override public void run() { web.setVisibility(View.VISIBLE); } });
            }
        }, "RebornOverlay");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    OverlayLog.add("screen " + id + ": page error " + error.getErrorCode() + " " + error.getDescription());
                    view.setVisibility(View.INVISIBLE);
                    reloadLater(id);
                }
            }

            @Override
            public void onPageFinished(WebView view, String finishedUrl) {
                OverlayLog.add("screen " + id + ": page loaded");
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler sslHandler, SslError error) {
                OverlayLog.add("screen " + id + ": certificate problem, page not shown");
                sslHandler.cancel(); // never carry on past a certificate problem
                view.setVisibility(View.INVISIBLE);
                reloadLater(id);
            }
        });
        int flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
                | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS;
        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT, typeFor(display), flags, PixelFormat.TRANSLUCENT);
        if (alpha < OPAQUE) params.alpha = alpha;
        WindowManager windows = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
        try {
            windows.addView(web, params);
        } catch (RuntimeException refused) {
            Log.w(TAG, "screen " + id + " would not take the overlay: " + refused);
            OverlayLog.add("screen " + id + ": window refused: " + refused.getClass().getSimpleName() + " " + refused.getMessage());
            web.destroy();
            return;
        }
        OverlayLog.add("screen " + id + ": window added");
        Layer layer = new Layer(windows, web);
        layer.shownUrl = url;
        layers.put(id, layer);
        web.loadUrl(url);
    }

    private void remove(int id) {
        Layer layer = layers.remove(id);
        if (layer == null) return;
        try { layer.windows.removeView(layer.web); } catch (RuntimeException gone) { /* the screen went away with its window */ }
        layer.web.destroy();
    }

    private void reloadLater(final int id) {
        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                Layer layer = layers.get(id);
                if (layer != null) layer.web.loadUrl(layer.shownUrl);
            }
        }, RELOAD_AFTER_MS);
    }
}
