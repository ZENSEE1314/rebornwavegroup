package expo.modules.tvoverlay

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Lets the website (Admin › Lights & TV › TV, opened inside the app on the karaoke box) draw a TV screen's page — gift effects, "now singing"
// bar — over everything else on that box, so no second app is needed. The drawing itself is OverlayService.
class TvOverlayModule : Module() {
  private val context get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("TvOverlay")

    Function("canDraw") { OverlayService.canDraw(context) }
    Function("isRunning") { OverlayService.running }
    Function("savedUrl") { OverlayService.savedUrl(context) }
    Function("openPermission") {
      val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + context.packageName)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }
    Function("start") { url: String -> OverlayService.start(context, url) }
    Function("stop") { OverlayService.stop(context) }
  }
}
