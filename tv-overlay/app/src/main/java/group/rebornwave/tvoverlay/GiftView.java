package group.rebornwave.tvoverlay;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Handler;
import android.os.Looper;
import android.text.TextUtils;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.animation.OvershootInterpolator;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayDeque;
import java.util.Random;

/**
 * What the box draws over the karaoke picture, made of plain Android views (no web page): a bar along the top with the song now on and the next
 * ones, and each gift as a big picture that pops in with the sender, the receiver and the gift's name, with its emoji raining down behind.
 * Gifts that arrive together play one after the other.
 */
final class GiftView extends FrameLayout {
    private static final long SHOW_MS = 8_000;
    private static final long POP_MS = 500;
    private static final long FALL_MS = 3_500;
    private static final long RAIN_SPREAD_MS = 2_500;
    private static final int RAIN_COUNT = 18;
    private static final int RAIN_SP = 48;
    private static final int EMOJI_SP = 140;
    private static final int WHO_SP = 34;
    private static final int BAR_SP = 26;
    private static final int PICTURE_PX = 420;
    private static final int FALLBACK_WIDTH_PX = 1280;
    private static final int FALLBACK_HEIGHT_PX = 720;
    private static final int MAX_WAITING_GIFTS = 12;
    private static final int PICTURE_TIMEOUT_MS = 6_000;
    private static final String DEFAULT_EMOJI = "🎁";

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Random random = new Random();
    private final ArrayDeque<TvFeed.Gift> waiting = new ArrayDeque<TvFeed.Gift>();
    private final TextView bar;
    private final FrameLayout stage;
    private boolean playing = false;
    private boolean closed = false;

    GiftView(Context context) {
        super(context);
        bar = new TextView(context);
        bar.setTextColor(Color.WHITE);
        bar.setTextSize(TypedValue.COMPLEX_UNIT_SP, BAR_SP);
        bar.setTypeface(Typeface.DEFAULT_BOLD);
        bar.setSingleLine(true);
        bar.setEllipsize(TextUtils.TruncateAt.MARQUEE);
        bar.setMarqueeRepeatLimit(-1);
        bar.setSelected(true); // a marquee only scrolls in a selected view
        bar.setBackgroundColor(Color.argb(170, 0, 0, 0));
        bar.setPadding(24, 12, 24, 12);
        bar.setVisibility(View.GONE);
        stage = new FrameLayout(context);
        addView(stage, new FrameLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));
        addView(bar, new FrameLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT, Gravity.TOP));
    }

    void setBar(String text) {
        bar.setText(text);
        bar.setVisibility(text.isEmpty() ? View.GONE : View.VISIBLE);
    }

    void play(TvFeed.Gift gift) {
        if (closed || waiting.size() >= MAX_WAITING_GIFTS) return;
        waiting.add(gift);
        if (!playing) playNext();
    }

    void close() {
        closed = true;
        handler.removeCallbacksAndMessages(null);
        waiting.clear();
        stage.removeAllViews();
    }

    private void playNext() {
        TvFeed.Gift gift = waiting.poll();
        if (gift == null || closed) {
            playing = false;
            return;
        }
        playing = true;
        showGift(gift);
        handler.postDelayed(new Runnable() {
            @Override public void run() { endGift(); }
        }, SHOW_MS);
    }

    private void endGift() {
        stage.animate().alpha(0f).setDuration(POP_MS).withEndAction(new Runnable() {
            @Override public void run() {
                stage.removeAllViews();
                stage.setAlpha(1f);
                playNext();
            }
        }).start();
    }

    private TextView text(String value, int sp, boolean bold) {
        TextView view = new TextView(getContext());
        view.setText(value);
        view.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        view.setTextColor(Color.WHITE);
        view.setGravity(Gravity.CENTER);
        view.setShadowLayer(10f, 0f, 0f, Color.BLACK);
        if (bold) view.setTypeface(Typeface.DEFAULT_BOLD);
        return view;
    }

    private void showGift(final TvFeed.Gift gift) {
        stage.removeAllViews();
        String emoji = gift.emoji.isEmpty() ? DEFAULT_EMOJI : gift.emoji;

        final LinearLayout card = new LinearLayout(getContext());
        card.setOrientation(LinearLayout.VERTICAL);
        card.setGravity(Gravity.CENTER);
        final TextView picture = text(emoji, EMOJI_SP, false);
        card.addView(picture);
        card.addView(text(who(gift), WHO_SP, true));
        card.addView(text(gift.name + (gift.kgold > 0 ? "   ·   " + gift.kgold + " KGOLD" : ""), WHO_SP, true));
        stage.addView(card, new FrameLayout.LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT, Gravity.CENTER));
        card.setScaleX(0f);
        card.setScaleY(0f);
        card.animate().scaleX(1f).scaleY(1f).setDuration(POP_MS).setInterpolator(new OvershootInterpolator()).start();

        if (!gift.imageUrl.isEmpty()) loadPicture(gift.imageUrl, card, picture);
        rain(emoji);
    }

    /** "Alex (Table 5) sent Sam (Table 9)" */
    private String who(TvFeed.Gift gift) {
        return side(gift.fromName, gift.fromTable) + "  " + Words.t("sent", "送给", "mengirim") + "  " + side(gift.toName, gift.toTable);
    }

    private static String side(String name, String table) {
        return name + (table.isEmpty() ? "" : " (" + Words.t("Table ", "桌 ", "Meja ") + table + ")");
    }

    private void rain(String emoji) {
        int width = getWidth() > 0 ? getWidth() : FALLBACK_WIDTH_PX;
        int height = getHeight() > 0 ? getHeight() : FALLBACK_HEIGHT_PX;
        for (int i = 0; i < RAIN_COUNT; i++) {
            TextView drop = text(emoji, RAIN_SP, false);
            stage.addView(drop, new FrameLayout.LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT, Gravity.TOP | Gravity.START));
            drop.setTranslationX(random.nextInt(Math.max(1, width - 100)));
            drop.setTranslationY(-200f);
            drop.animate().translationY(height).setStartDelay(random.nextInt((int) RAIN_SPREAD_MS)).setDuration(FALL_MS).start();
        }
    }

    /** The gift's own picture replaces the emoji once it has arrived; if it cannot be fetched the emoji stays. */
    private void loadPicture(final String address, final LinearLayout card, final TextView emoji) {
        new Thread(new Runnable() {
            @Override public void run() {
                final Bitmap bitmap = fetch(address);
                if (bitmap == null) return;
                handler.post(new Runnable() {
                    @Override public void run() {
                        if (closed || card.getParent() == null) return;
                        ImageView image = new ImageView(getContext());
                        image.setImageBitmap(bitmap);
                        image.setAdjustViewBounds(true);
                        card.removeView(emoji);
                        card.addView(image, 0, new LinearLayout.LayoutParams(PICTURE_PX, PICTURE_PX));
                    }
                });
            }
        }, "gift-picture").start();
    }

    private static Bitmap fetch(String address) {
        HttpURLConnection connection = null;
        try {
            if (!address.startsWith("http")) return null;
            connection = (HttpURLConnection) new URL(address).openConnection();
            connection.setConnectTimeout(PICTURE_TIMEOUT_MS);
            connection.setReadTimeout(PICTURE_TIMEOUT_MS);
            InputStream in = connection.getInputStream();
            try { return BitmapFactory.decodeStream(in); } finally { in.close(); }
        } catch (Exception unreachable) {
            return null;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }
}
