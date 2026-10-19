package group.rebornwave.tvoverlay;

import android.accessibilityservice.AccessibilityService;
import android.content.ComponentName;
import android.content.Context;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.net.http.SslError;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.View;
import android.view.WindowManager;
import android.view.accessibility.AccessibilityEvent;
import android.webkit.JavascriptInterface;
import android.webkit.SslErrorHandler;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * The other way to draw the gifts over the karaoke picture, for boxes that hide "Display over other apps": an accessibility service may add
 * windows of its own kind (TYPE_ACCESSIBILITY_OVERLAY) without that permission. It reads nothing from the screen; it only keeps the see-through
 * page of the linked TV screen on top, and takes it away when the box is unlinked.
 */
public class OverlayAccessibilityService extends AccessibilityService {
    static volatile boolean running = false;

    private static final long CHECK_MS = 2000;
    private static final long RELOAD_AFTER_MS = 10_000;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private WindowManager windows;
    private WebView web;
    private String shownUrl = "";

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
        windows = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
        running = true;
        handler.post(check);
    }

    /** Shows the page when this box is linked, takes it away when it is not, and moves to the new page when the link changed. */
    private void sync() {
        if (!Link.isLinked(this)) { hide(); return; }
        String url = Link.pageUrl(this);
        if (web != null && url.equals(shownUrl)) return;
        if (web != null) { web.loadUrl(url); shownUrl = url; return; }
        show(url);
    }

    private void show(String url) {
        web = new WebView(getApplicationContext());
        web.setBackgroundColor(Color.TRANSPARENT);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setMediaPlaybackRequiresUserGesture(false);
        // Hidden until the page itself says it runs (RebornOverlay.ready()): a page that cannot load or run on this box never covers the picture.
        web.setVisibility(View.INVISIBLE);
        web.addJavascriptInterface(new Object() {
            @JavascriptInterface
            public void ready() {
                handler.post(new Runnable() { @Override public void run() { if (web != null) web.setVisibility(View.VISIBLE); } });
            }
        }, "RebornOverlay");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) { view.setVisibility(View.INVISIBLE); reloadLater(); }
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler sslHandler, SslError error) {
                sslHandler.cancel(); // never carry on past a certificate problem
                view.setVisibility(View.INVISIBLE);
                reloadLater();
            }
        });
        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
                        | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT);
        try {
            windows.addView(web, params);
        } catch (RuntimeException e) {
            web.destroy();
            web = null;
            return;
        }
        shownUrl = url;
        web.loadUrl(url);
    }

    private void reloadLater() {
        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                if (web != null) web.loadUrl(shownUrl);
            }
        }, RELOAD_AFTER_MS);
    }

    private void hide() {
        if (web == null) return;
        try { windows.removeView(web); } catch (RuntimeException ignored) { }
        web.destroy();
        web = null;
        shownUrl = "";
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
        handler.removeCallbacksAndMessages(null);
        hide();
        super.onDestroy();
    }
}
