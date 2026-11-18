package group.rebornwave.tvoverlay;

import android.app.Presentation;
import android.content.Context;
import android.view.Display;
import android.view.WindowManager;

/** The TV (HDMI) screen: shows a TvLayer there while the box's own touch screen keeps the song pages. Android lets an app do this with no permission. */
final class TvPresentation extends Presentation {
    final TvLayer layer;

    TvPresentation(Context outer, Display display) {
        super(outer, display);
        layer = new TvLayer(getContext());
        setContentView(layer);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }
}
