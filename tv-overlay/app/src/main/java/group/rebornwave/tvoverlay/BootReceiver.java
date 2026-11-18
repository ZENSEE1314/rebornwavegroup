package group.rebornwave.tvoverlay;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Starts the song-system connector and the overlay when the box starts (and after this app is updated), if they were set up before. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (BridgeSettings.isReady(context) && !BridgeSettings.isPlayerMode(context)) BridgeService.start(context);
        if (Link.isLinked(context) && !OverlayAccessibilityService.isEnabled(context) && OverlayService.canShow(context)) OverlayService.start(context);
    }
}
