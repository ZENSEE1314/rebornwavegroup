package expo.modules.tvoverlay

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

// Starts the overlay again when the box starts (and after the app is updated), if it was running before and is still allowed to draw.
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val url = OverlayService.savedUrl(context)
    if (url.isNotEmpty() && OverlayService.canDraw(context)) OverlayService.start(context, url)
  }
}
