package group.rebornwave.tvoverlay;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.view.WindowManager;

/**
 * Draws the TV screen's page (gift effects, "now singing" bar) over everything else on this box, including the karaoke picture, on the HDMI / TV
 * screen and / or the main screen (see Screens). The windows cannot be touched or focused, so the karaoke program keeps working underneath;
 * the page itself is see-through.
 */
public class OverlayService extends Service {
    static volatile boolean running = false;
    static volatile OverlayWindows windowsNow;

    private static final String CHANNEL = "overlay";
    private static final int NOTIFICATION_ID = 1;
    private static final float TOUCH_PASS_THROUGH_ALPHA = 0.79f;

    private OverlayWindows windows;

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
        if (windows == null) {
            // Android 12+ drops taps that pass through another app's window more opaque than 0.8: stay just under it.
            int type = Build.VERSION.SDK_INT >= 26 ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY : WindowManager.LayoutParams.TYPE_PHONE;
            windows = new OverlayWindows(this, type, TOUCH_PASS_THROUGH_ALPHA);
            windowsNow = windows;
        }
        windows.show(Link.pageUrl(this));
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

    @Override
    public void onDestroy() {
        running = false;
        windowsNow = null;
        if (windows != null) {
            windows.hide();
            windows = null;
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
