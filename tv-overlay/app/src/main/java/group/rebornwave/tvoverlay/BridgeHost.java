package group.rebornwave.tvoverlay;

import android.content.Context;
import android.os.Handler;
import android.util.Base64;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.URL;
import java.nio.charset.Charset;
import java.util.Enumeration;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * What the bridge page (assets/bridge.js, the karaoke bridge as a program) asks of this app, as `AndroidHost`: web calls, a clock,
 * a few files, this box's addresses and a place to write what it does. The page never touches the network or the clock itself,
 * so no cross-site rule and no timer slowdown of the WebView can get in its way.
 */
final class BridgeHost {
    private static final String TAG = "RebornBridge";
    private static final int HTTP_THREADS = 24; // the box is searched 64 addresses at a time, the song list is read 4 pages at a time
    private static final int MAX_CONNECT_MS = 10_000;
    private static final int COPY_BUFFER = 16 * 1024;
    private static final Charset UTF8 = Charset.forName("UTF-8");

    private final Context context;
    private final Handler ui;
    private final ExecutorService pool = Executors.newFixedThreadPool(HTTP_THREADS);
    private volatile WebView web;
    private volatile long lastSleepAt = System.currentTimeMillis();

    BridgeHost(Context context, Handler ui) {
        this.context = context.getApplicationContext();
        this.ui = ui;
    }

    void attach(WebView page) {
        web = page;
    }

    void shutdown() {
        web = null;
        pool.shutdownNow();
    }

    /** The page asks for a pause between its rounds all the time: a long silence means it is stuck. */
    long millisSinceLastSleep() {
        return System.currentTimeMillis() - lastSleepAt;
    }

    private void run(final String script) {
        ui.post(new Runnable() {
            @Override public void run() {
                WebView page = web;
                if (page != null) page.evaluateJavascript(script, null);
            }
        });
    }

    @JavascriptInterface
    public void http(final int id, final String method, final String url, final String headersJson, final String body, final int timeoutMs) {
        try {
            pool.execute(new Runnable() {
                @Override public void run() { request(id, method, url, headersJson, body, timeoutMs); }
            });
        } catch (RuntimeException stopped) {
            // the app is shutting this page down: nobody waits for the answer
        }
    }

    private void request(int id, String method, String url, String headersJson, String body, int timeoutMs) {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(url).openConnection();
            connection.setRequestMethod(method);
            connection.setConnectTimeout(Math.min(timeoutMs, MAX_CONNECT_MS));
            connection.setReadTimeout(timeoutMs);
            connection.setUseCaches(false);
            JSONObject headers = new JSONObject(headersJson);
            Iterator<String> names = headers.keys();
            while (names.hasNext()) {
                String name = names.next();
                connection.setRequestProperty(name, headers.getString(name));
            }
            if (!body.isEmpty()) {
                byte[] bytes = body.getBytes(UTF8);
                connection.setDoOutput(true);
                connection.setFixedLengthStreamingMode(bytes.length);
                OutputStream out = connection.getOutputStream();
                try { out.write(bytes); } finally { out.close(); }
            }
            int status = connection.getResponseCode();
            InputStream in = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
            byte[] data = in == null ? new byte[0] : readAll(in);
            JSONObject answerHeaders = new JSONObject();
            for (Map.Entry<String, List<String>> header : connection.getHeaderFields().entrySet()) {
                if (header.getKey() != null && !header.getValue().isEmpty()) answerHeaders.put(header.getKey().toLowerCase(Locale.ROOT), header.getValue().get(0));
            }
            answer(id, status, answerHeaders.toString(), Base64.encodeToString(data, Base64.NO_WRAP), null);
        } catch (Exception failure) {
            answer(id, 0, "{}", "", failure.getClass().getSimpleName() + ": " + failure.getMessage());
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private static byte[] readAll(InputStream in) throws java.io.IOException {
        try {
            ByteArrayOutputStream all = new ByteArrayOutputStream();
            byte[] chunk = new byte[COPY_BUFFER];
            int read;
            while ((read = in.read(chunk)) != -1) all.write(chunk, 0, read);
            return all.toByteArray();
        } finally {
            in.close();
        }
    }

    private void answer(int id, int status, String headers, String bodyBase64, String error) {
        run("window.__hostHttp(" + id + "," + status + "," + JSONObject.quote(headers) + "," + JSONObject.quote(bodyBase64) + "," + (error == null ? "null" : JSONObject.quote(error)) + ")");
    }

    @JavascriptInterface
    public void sleep(final int id, int millis) {
        lastSleepAt = System.currentTimeMillis();
        ui.postDelayed(new Runnable() {
            @Override public void run() {
                WebView page = web;
                if (page != null) page.evaluateJavascript("window.__hostWake(" + id + ")", null);
            }
        }, millis);
    }

    // ---- files: the song list and the box found last time, by plain name in the app's own folder ----

    private File fileNamed(String name) {
        if (!name.matches("[A-Za-z0-9._-]{1,64}")) return null;
        return new File(context.getFilesDir(), name);
    }

    @JavascriptInterface
    public long fileAge(String name) {
        File file = fileNamed(name);
        return file != null && file.isFile() ? System.currentTimeMillis() - file.lastModified() : -1;
    }

    @JavascriptInterface
    public String readFile(String name) {
        File file = fileNamed(name);
        if (file == null || !file.isFile()) return null;
        try {
            java.io.FileInputStream in = new java.io.FileInputStream(file);
            return new String(readAll(in), UTF8);
        } catch (java.io.IOException unreadable) {
            return null;
        }
    }

    @JavascriptInterface
    public boolean writeFile(String name, String text) {
        File file = fileNamed(name);
        if (file == null) return false;
        File half = new File(file.getPath() + ".part");
        try {
            FileOutputStream out = new FileOutputStream(half);
            try { out.write(text.getBytes(UTF8)); } finally { out.close(); }
            return half.renameTo(file) || (file.delete() && half.renameTo(file));
        } catch (java.io.IOException failed) {
            return false;
        }
    }

    // ---- the rest ----

    /** This box's own IPv4 addresses, as a JSON list. */
    @JavascriptInterface
    public String addresses() {
        JSONArray found = new JSONArray();
        try {
            Enumeration<NetworkInterface> all = NetworkInterface.getNetworkInterfaces();
            while (all != null && all.hasMoreElements()) {
                NetworkInterface nic = all.nextElement();
                if (!nic.isUp() || nic.isLoopback()) continue;
                Enumeration<InetAddress> own = nic.getInetAddresses();
                while (own.hasMoreElements()) {
                    InetAddress address = own.nextElement();
                    if (address instanceof Inet4Address) found.put(address.getHostAddress());
                }
            }
        } catch (java.net.SocketException none) {
            // no network yet: an empty list, the page looks again soon
        }
        return found.toString();
    }

    @JavascriptInterface
    public String config() {
        return BridgeSettings.json(context);
    }

    @JavascriptInterface
    public void log(String line) {
        Log.i(TAG, line);
        BridgeService.addLine(line);
    }

    @JavascriptInterface
    public void status(String text) {
        BridgeService.status = text;
    }
}
