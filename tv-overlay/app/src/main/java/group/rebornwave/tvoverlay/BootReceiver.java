package group.rebornwave.tvoverlay;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Starts the overlay when the box starts (and after this app is updated), if it was linked and allowed before. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Link.isLinked(context) && OverlayService.canDraw(context)) OverlayService.start(context);
    }
}
