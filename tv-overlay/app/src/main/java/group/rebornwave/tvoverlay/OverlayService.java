package group.rebornwave.tvoverlay;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.net.http.SslError;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.provider.Settings;
import android.view.WindowManager;
import android.webkit.SslErrorHandler;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * Draws the TV screen's page (gift effects, "now singing" bar) over everything else on this box, including the karaoke picture.
 * The window cannot be touched or focused, so the karaoke program keeps working underneath; the page itself is see-through.
 */
public class OverlayService extends Service {
    static volatile boolean running = false;

    private static final String CHANNEL = "overlay";
    private static final int NOTIFICATION_ID = 1;
    private static final long RELOAD_AFTER_MS = 10_000;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private WindowManager windows;
    private WebView web;

    static void start(Context context) {
        Intent intent = new Intent(context, OverlayService.class);
        if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(intent);
        else context.startService(intent);
    }

    static void stop(Context context) {
        context.stopService(new Intent(context, OverlayService.class));
    }

    static boolean canDraw(Context context) {
        return Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(context);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        showNotification();
        if (!canDraw(this) || !Link.isLinked(this)) {
            stopSelf();
            return START_NOT_STICKY;
        }
        show();
        running = true;
        return START_STICKY;
    }

    private void showNotification() {
        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(CHANNEL, "Gift overlay", NotificationManager.IMPORTANCE_MIN);
            ((NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE)).createNotificationChannel(channel);
            builder = new Notification.Builder(this, CHANNEL);
        } else {
            builder = new Notification.Builder(this);
        }
        builder.setContentTitle("Gift overlay is on").setSmallIcon(android.R.drawable.ic_dialog_info);
        startForeground(NOTIFICATION_ID, builder.build());
    }

    private void show() {
        if (web != null) return;
        windows = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
        web = new WebView(getApplicationContext());
        web.setBackgroundColor(Color.TRANSPARENT);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) reloadLater();
            }

            @Override
            @SuppressWarnings("deprecation")
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                if (Build.VERSION.SDK_INT < 23) reloadLater();
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler sslHandler, SslError error) {
                sslHandler.cancel(); // never carry on past a certificate problem
                reloadLater();
            }
        });

        int type = Build.VERSION.SDK_INT >= 26 ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY : WindowManager.LayoutParams.TYPE_PHONE;
        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT, type,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
                        | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT);
        windows.addView(web, params);
        web.loadUrl(Link.pageUrl(this));
    }

    private void reloadLater() {
        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                if (web != null) web.loadUrl(Link.pageUrl(OverlayService.this));
            }
        }, RELOAD_AFTER_MS);
    }

    @Override
    public void onDestroy() {
        running = false;
        handler.removeCallbacksAndMessages(null);
        if (web != null) {
            try { windows.removeView(web); } catch (RuntimeException ignored) { }
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
