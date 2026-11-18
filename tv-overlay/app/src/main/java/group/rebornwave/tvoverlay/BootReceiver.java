package group.rebornwave.tvoverlay;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Starts the song-system connector and the overlay when the box starts (and after this app is updated), if they were set up before; an app with the club's box key links itself first. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(final Context context, Intent intent) {
        startWhatIsLinked(context);
        Enroll.start(context, new Enroll.Done() {
            @Override public void onLinked() { startWhatIsLinked(context); }
        });
    }

    private static void startWhatIsLinked(Context context) {
        if (BridgeSettings.isReady(context) && !BridgeSettings.isPlayerMode(context)) BridgeService.start(context);
        if (Link.isLinked(context) && !OverlayAccessibilityService.isEnabled(context) && OverlayService.canShow(context)) OverlayService.start(context);
    }
}
