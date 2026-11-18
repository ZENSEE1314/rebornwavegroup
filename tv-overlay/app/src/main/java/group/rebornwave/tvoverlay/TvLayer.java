package group.rebornwave.tvoverlay;

import android.content.Context;
import android.view.SurfaceView;
import android.widget.FrameLayout;

/** Everything the TV shows: the song video, a YouTube video, the table boxes / now-singing card, and the gifts over all of it. */
final class TvLayer extends FrameLayout {
    final SurfaceView video;
    final YouTubeView youtube;
    final StageView stage;
    final GiftView gifts;

    TvLayer(Context context) {
        super(context);
        setBackgroundColor(0xFF000000);
        video = new SurfaceView(context);
        youtube = new YouTubeView(context);
        stage = new StageView(context);
        gifts = new GiftView(context);
        for (android.view.View layer : new android.view.View[]{video, youtube, stage, gifts}) {
            addView(layer, new FrameLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));
        }
    }
}
