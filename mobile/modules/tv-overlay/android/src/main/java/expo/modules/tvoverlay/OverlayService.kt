package expo.modules.tvoverlay

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.net.http.SslError
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.view.WindowManager
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.SslErrorHandler
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient

// Draws the TV screen's page over everything else, including the karaoke picture. The window cannot be touched or focused, so the karaoke
// program keeps working underneath; the page itself is see-through.
class OverlayService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private var windows: WindowManager? = null
  private var web: WebView? = null
  private var url = ""

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    showNotification()
    url = intent?.getStringExtra(EXTRA_URL) ?: savedUrl(this)
    if (url.isEmpty() || !canDraw(this)) {
      stopSelf()
      return START_NOT_STICKY
    }
    show()
    running = true
    return START_STICKY
  }

  private fun showNotification() {
    val builder = if (Build.VERSION.SDK_INT >= 26) {
      val channel = NotificationChannel(CHANNEL, "Gift overlay", NotificationManager.IMPORTANCE_MIN)
      (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(channel)
      Notification.Builder(this, CHANNEL)
    } else {
      @Suppress("DEPRECATION") Notification.Builder(this)
    }
    val notification = builder.setContentTitle("Gift overlay is on").setSmallIcon(android.R.drawable.ic_dialog_info).build()
    if (Build.VERSION.SDK_INT >= 34) startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    else startForeground(NOTIFICATION_ID, notification)
  }

  private fun show() {
    val existing = web
    if (existing != null) {
      if (existing.url != url) existing.loadUrl(url)
      return
    }
    val manager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
    windows = manager
    val view = WebView(applicationContext)
    view.setBackgroundColor(Color.TRANSPARENT)
    view.settings.javaScriptEnabled = true
    view.settings.domStorageEnabled = true
    view.settings.mediaPlaybackRequiresUserGesture = false
    // Hidden until the page itself says it runs (RebornOverlay.ready()): a page that cannot load or run on this device never covers the picture.
    view.visibility = View.INVISIBLE
    view.addJavascriptInterface(object {
      @JavascriptInterface
      fun ready() { handler.post { web?.visibility = View.VISIBLE } }
    }, "RebornOverlay")
    view.webViewClient = object : WebViewClient() {
      override fun onReceivedError(webView: WebView, request: WebResourceRequest, error: WebResourceError) {
        if (request.isForMainFrame) { webView.visibility = View.INVISIBLE; reloadLater() }
      }

      override fun onReceivedSslError(webView: WebView, sslHandler: SslErrorHandler, error: SslError) {
        sslHandler.cancel() // never carry on past a certificate problem
        webView.visibility = View.INVISIBLE
        reloadLater()
      }
    }
    @Suppress("DEPRECATION")
    val type = if (Build.VERSION.SDK_INT >= 26) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY else WindowManager.LayoutParams.TYPE_PHONE
    val params = WindowManager.LayoutParams(
      WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT, type,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE or
        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
      PixelFormat.TRANSLUCENT,
    )
    params.alpha = TOUCH_PASS_THROUGH_ALPHA // Android 12+ drops taps that pass through another app's window more opaque than this
    manager.addView(view, params)
    web = view
    view.loadUrl(url)
  }

  private fun reloadLater() {
    handler.postDelayed({ web?.loadUrl(url) }, RELOAD_AFTER_MS)
  }

  override fun onDestroy() {
    running = false
    handler.removeCallbacksAndMessages(null)
    val view = web
    if (view != null) {
      try { windows?.removeView(view) } catch (_: RuntimeException) { }
      view.destroy()
    }
    web = null
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  companion object {
    @Volatile var running = false

    private const val CHANNEL = "overlay"
    private const val NOTIFICATION_ID = 1
    private const val RELOAD_AFTER_MS = 10_000L
    private const val TOUCH_PASS_THROUGH_ALPHA = 0.79f
    private const val EXTRA_URL = "url"
    private const val PREFS = "tv_overlay"
    private const val KEY_URL = "url"

    fun canDraw(context: Context): Boolean = Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(context)

    fun savedUrl(context: Context): String = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_URL, "") ?: ""

    fun start(context: Context, url: String) {
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_URL, url).apply()
      val intent = Intent(context, OverlayService::class.java).putExtra(EXTRA_URL, url)
      if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(intent) else context.startService(intent)
    }

    // Stopping also forgets the address, so the box does not start the overlay again by itself.
    fun stop(context: Context) {
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(KEY_URL).apply()
      context.stopService(Intent(context, OverlayService::class.java))
    }
  }
}
