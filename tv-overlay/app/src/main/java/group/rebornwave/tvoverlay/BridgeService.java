package group.rebornwave.tvoverlay;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.util.ArrayDeque;

/**
 * The karaoke bridge, running on the karaoke box itself so no PC is needed: it joins the app's song queue to the box's own song system.
 * The program (assets/bridge.js, built from venue/karaoke-bridge.mjs) runs in a hidden page; BridgeHost gives it the network, the clock and files.
 * It starts with the box (BootReceiver) and is restarted by the system and by its own watchdog if it ever stops.
 */
public class BridgeService extends Service {
    static volatile boolean running = false;
    static volatile String status = "";

    private static final String CHANNEL = "bridge";
    private static final int NOTIFICATION_ID = 2;
    private static final String PAGE = "file:///android_asset/bridge.html";
    private static final String WAKE_LOCK_TAG = "reborn:bridge";
    private static final long WATCHDOG_EVERY_MS = 60_000;
    private static final long STUCK_AFTER_MS = 3 * 60_000; // the program pauses every second or two: this long without a pause means it is stuck
    private static final int KEPT_LINES = 40;
    private static final ArrayDeque<String> LINES = new ArrayDeque<String>();

    private final Handler handler = new Handler(Looper.getMainLooper());
    private WebView web;
    private BridgeHost host;
    private PowerManager.WakeLock wakeLock;

    static void start(Context context) {
        Intent intent = new Intent(context, BridgeService.class);
        if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(intent);
        else context.startService(intent);
    }

    static void stop(Context context) {
        context.stopService(new Intent(context, BridgeService.class));
    }

    static void addLine(String line) {
        synchronized (LINES) {
            LINES.addLast(line);
            while (LINES.size() > KEPT_LINES) LINES.removeFirst();
        }
    }

    static String recentLines(int count) {
        synchronized (LINES) {
            StringBuilder text = new StringBuilder();
            int skip = Math.max(0, LINES.size() - count);
            int index = 0;
            for (String line : LINES) {
                if (index++ < skip) continue;
                text.append(line.length() > 160 ? line.substring(0, 160) : line).append('\n');
            }
            return text.toString();
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        showNotification();
        if (!BridgeSettings.isReady(this)) {
            stopSelf();
            return START_NOT_STICKY;
        }
        keepAwake();
        startPage();
        running = true;
        handler.removeCallbacks(watchdog);
        handler.postDelayed(watchdog, WATCHDOG_EVERY_MS);
        return START_STICKY;
    }

    private void showNotification() {
        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel channel = new NotificationChannel(CHANNEL, "Song system connector", NotificationManager.IMPORTANCE_MIN);
            ((NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE)).createNotificationChannel(channel);
            builder = new Notification.Builder(this, CHANNEL);
        } else {
            builder = new Notification.Builder(this);
        }
        builder.setContentTitle("Song system connector is on").setSmallIcon(android.R.drawable.ic_dialog_info);
        startForeground(NOTIFICATION_ID, builder.build());
    }

    private void keepAwake() {
        if (wakeLock != null && wakeLock.isHeld()) return;
        PowerManager power = (PowerManager) getSystemService(Context.POWER_SERVICE);
        wakeLock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, WAKE_LOCK_TAG);
        wakeLock.acquire();
    }

    private void startPage() {
        if (web != null) return;
        host = new BridgeHost(this, handler);
        web = new WebView(getApplicationContext());
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        web.addJavascriptInterface(host, "AndroidHost");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                addLine("the page's process stopped: starting it again");
                restartPage();
                return true;
            }
        });
        host.attach(web);
        status = "Starting ...";
        web.loadUrl(PAGE);
    }

    private void stopPage() {
        handler.removeCallbacksAndMessages(null);
        if (host != null) host.shutdown();
        host = null;
        if (web != null) {
            web.destroy();
            web = null;
        }
    }

    private void restartPage() {
        stopPage();
        startPage();
        handler.postDelayed(watchdog, WATCHDOG_EVERY_MS);
    }

    private final Runnable watchdog = new Runnable() {
        @Override
        public void run() {
            if (host != null && host.millisSinceLastSleep() > STUCK_AFTER_MS) {
                addLine("the connector was stuck: starting it again");
                restartPage();
                return;
            }
            handler.postDelayed(this, WATCHDOG_EVERY_MS);
        }
    };

    @Override
    public void onDestroy() {
        running = false;
        stopPage();
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
