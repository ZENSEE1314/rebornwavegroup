package group.rebornwave.tvoverlay;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Updates the public overlay app by itself: when the app is opened it reads the newest version number the build published
 * (version.txt beside the apk in the release) and, if it is newer than this one, downloads the apk and opens Android's installer.
 * Android never lets an app replace itself silently, so the person on the box taps Install once.
 * The private app (with the club's box key) is never updated from here: the public apk has no key and would unlink the box.
 */
final class Updater {
    private static final String RELEASE = "https://github.com/ZENSEE1314/rebornwavegroup/releases/download/tv-overlay-latest/";
    private static final String VERSION_FILE = "version.txt";
    private static final String APK_FILE = "reborn-tv-overlay.apk";
    private static final String PREFS = "updater";
    private static final String LAST_CHECK = "lastCheck";
    private static final long CHECK_EVERY_MS = 6L * 60 * 60 * 1000;
    private static final int TIMEOUT_MS = 20_000;
    private static final int VERSION_MAX_BYTES = 32;
    private static volatile boolean busy;

    private Updater() {}

    static void checkIfDue(final Activity activity) {
        if (!BuildConfig.BOX_KEY.isEmpty() || busy) return;
        final SharedPreferences prefs = activity.getSharedPreferences(PREFS, Activity.MODE_PRIVATE);
        long now = System.currentTimeMillis();
        if (now - prefs.getLong(LAST_CHECK, 0) < CHECK_EVERY_MS) return;
        busy = true;
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    int newest = readNewestVersion();
                    if (newest > BuildConfig.VERSION_CODE) install(activity, download(activity));
                    else prefs.edit().putLong(LAST_CHECK, System.currentTimeMillis()).apply(); // an update waiting is offered again at the next opening
                } catch (Exception e) {
                    OverlayLog.add("update check failed: " + e.getMessage());
                } finally {
                    busy = false;
                }
            }
        }, "updater").start();
    }

    private static int readNewestVersion() throws Exception {
        HttpURLConnection conn = open(RELEASE + VERSION_FILE);
        try (InputStream in = conn.getInputStream()) {
            byte[] buf = new byte[VERSION_MAX_BYTES];
            int n = in.read(buf);
            return Integer.parseInt(new String(buf, 0, Math.max(n, 0), "UTF-8").trim());
        } finally {
            conn.disconnect();
        }
    }

    private static File download(Activity activity) throws Exception {
        File dir = new File(activity.getCacheDir(), "update");
        if (!dir.exists() && !dir.mkdirs()) throw new Exception("no cache folder");
        File apk = new File(dir, APK_FILE);
        HttpURLConnection conn = open(RELEASE + APK_FILE);
        try (InputStream in = conn.getInputStream(); FileOutputStream out = new FileOutputStream(apk)) {
            byte[] buf = new byte[64 * 1024];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        } finally {
            conn.disconnect();
        }
        return apk;
    }

    private static HttpURLConnection open(String address) throws Exception {
        HttpURLConnection conn = (HttpURLConnection) new URL(address).openConnection();
        conn.setConnectTimeout(TIMEOUT_MS);
        conn.setReadTimeout(TIMEOUT_MS);
        conn.setInstanceFollowRedirects(true);
        if (conn.getResponseCode() != 200) throw new Exception("HTTP " + conn.getResponseCode());
        return conn;
    }

    private static void install(final Activity activity, final File apk) {
        activity.runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (Build.VERSION.SDK_INT >= 26 && !activity.getPackageManager().canRequestPackageInstalls()) {
                    // The person allows installs from this app once; the next check (next time the app opens) then installs.
                    activity.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + activity.getPackageName())));
                    return;
                }
                Uri uri = FileProvider.getUriForFile(activity, activity.getPackageName() + ".updates", apk);
                Intent intent = new Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/vnd.android.package-archive")
                        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                activity.startActivity(intent);
            }
        });
    }
}
