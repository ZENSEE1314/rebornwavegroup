package group.rebornwave.tvoverlay;

import android.annotation.SuppressLint;
import android.content.Context;
import android.graphics.Color;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.FrameLayout;

/**
 * Shows a YouTube karaoke video with YouTube's own embedded player (the video is streamed by YouTube, never downloaded or taken apart, and
 * YouTube's rules for embeds apply, including its ads). The player page is small and local; it reports back when the video ended or cannot be
 * shown (not embeddable, an old web view that YouTube's player does not run in), so the queue moves on.
 */
final class YouTubeView extends FrameLayout {
    interface Listener {
        void onEnded();

        void onFailed();
    }

    private static final String EMBED_ORIGIN = "https://rebornwave.group/";
    private static final long START_TIMEOUT_MS = 25_000;
    private static final int STATE_ENDED = 0;
    private static final int STATE_PLAYING = 1;
    private static final String PLAYER_PAGE = "<html><body style=\"margin:0;background:#000;overflow:hidden\"><div id=\"p\"></div>"
            + "<script src=\"https://www.youtube.com/iframe_api\"></script><script>var player;"
            + "function onYouTubeIframeAPIReady(){player=new YT.Player('p',{width:'100%',height:'100%',videoId:'%ID%',"
            + "playerVars:{autoplay:1,controls:0,rel:0,modestbranding:1,playsinline:1,iv_load_policy:3,fs:0,origin:location.origin},"
            + "events:{onReady:function(e){e.target.playVideo();},onStateChange:function(e){Native.state(e.data);},onError:function(e){Native.error(e.data);}}});}"
            + "</script></body></html>";

    private final Handler ui = new Handler(Looper.getMainLooper());
    private final WebView web;
    private Listener listener;
    private boolean started = false;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    YouTubeView(Context context) {
        super(context);
        web = new WebView(context);
        web.setBackgroundColor(Color.BLACK);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        web.addJavascriptInterface(new Bridge(), "Native");
        addView(web, new FrameLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));
        setVisibility(View.GONE);
    }

    static boolean isVideoId(String id) {
        return id.matches("[A-Za-z0-9_-]{11}");
    }

    void play(String videoId, Listener listener) {
        this.listener = listener;
        started = false;
        setVisibility(View.VISIBLE);
        web.loadDataWithBaseURL(EMBED_ORIGIN, PLAYER_PAGE.replace("%ID%", videoId), "text/html", "utf-8", null);
        ui.removeCallbacksAndMessages(null);
        ui.postDelayed(new Runnable() {
            @Override public void run() { if (!started) fail(); }
        }, START_TIMEOUT_MS);
    }

    /** Stops the video and hides the view. */
    void stop() {
        ui.removeCallbacksAndMessages(null);
        listener = null;
        web.loadUrl("about:blank");
        setVisibility(View.GONE);
    }

    void setPaused(boolean paused) {
        run(paused ? "player.pauseVideo()" : "player.playVideo()");
    }

    void setVolume(int percent) {
        run("player.setVolume(" + Math.max(0, Math.min(100, percent)) + ")");
    }

    void restart() {
        run("player.seekTo(0,true)");
    }

    private void run(String script) {
        web.evaluateJavascript("if(window.player&&player.getPlayerState){" + script + "}", null);
    }

    private void fail() {
        Listener waiting = listener;
        stop();
        if (waiting != null) waiting.onFailed();
    }

    private final class Bridge {
        @JavascriptInterface
        public void state(final int state) {
            ui.post(new Runnable() {
                @Override public void run() {
                    if (state == STATE_PLAYING) started = true;
                    if (state == STATE_ENDED && listener != null) listener.onEnded();
                }
            });
        }

        @JavascriptInterface
        public void error(int code) {
            ui.post(new Runnable() {
                @Override public void run() { fail(); }
            });
        }
    }
}
