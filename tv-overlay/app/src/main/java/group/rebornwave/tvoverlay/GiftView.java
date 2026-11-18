package group.rebornwave.tvoverlay;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Typeface;
import android.animation.ObjectAnimator;
import android.animation.PropertyValuesHolder;
import android.graphics.ImageDecoder;
import android.graphics.drawable.AnimatedImageDrawable;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
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

import java.io.File;
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
    private static final int GREY_BOX = Color.argb(185, 55, 55, 55); // see-through grey behind the words
    private static final float GREY_BOX_RADIUS_PX = 28f;
    private static final int WORDS_PAD_PX = 36;
    private static final int ART_MAX_W_PX = 880;
    private static final int ART_MAX_H_PX = 520;
    private static final int HALO_EXTRA_PX = 140;
    private static final float HALO_RADIUS_PX = 430f;
    private static final long HALO_PULSE_MS = 900;
    private static final int HALO_COLOUR = Color.argb(150, 252, 211, 77);

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
        bar.setBackgroundColor(GREY_BOX);
        bar.setPadding(24, 12, 24, 12);
        bar.setVisibility(View.GONE);
        GiftArt.prefetch(context);
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
        // The words sit on a see-through grey box so they can be read over any karaoke picture.
        LinearLayout words = new LinearLayout(getContext());
        words.setOrientation(LinearLayout.VERTICAL);
        words.setGravity(Gravity.CENTER);
        words.setPadding(WORDS_PAD_PX, WORDS_PAD_PX / 2, WORDS_PAD_PX, WORDS_PAD_PX / 2);
        words.setBackground(greyBox());
        words.addView(text(who(gift), WHO_SP, true));
        words.addView(text(gift.name + (gift.kgold > 0 ? "   ·   " + gift.kgold + " KGOLD" : ""), WHO_SP, true));
        card.addView(words);
        stage.addView(card, new FrameLayout.LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT, Gravity.CENTER));
        card.setScaleX(0f);
        card.setScaleY(0f);
        card.animate().scaleX(1f).scaleY(1f).setDuration(POP_MS).setInterpolator(new OvershootInterpolator()).start();

        String scene = GiftArt.sceneOf(gift);
        // A gift with a picture of its own and no special scene shows that picture; every other gift plays the animation of its scene.
        if (!gift.imageUrl.isEmpty() && GiftArt.isFallback(scene)) loadPicture(gift.imageUrl, card, picture);
        else loadArt(scene, card, picture);
        rain(emoji);
    }

    private static GradientDrawable greyBox() {
        GradientDrawable box = new GradientDrawable();
        box.setColor(GREY_BOX);
        box.setCornerRadius(GREY_BOX_RADIUS_PX);
        return box;
    }

    /** Replaces the emoji with the animated picture of the gift's scene when this box has it (Android 9 and newer); until then, or without it, the emoji stays. */
    private void loadArt(final String scene, final LinearLayout card, final TextView emoji) {
        final File file = GiftArt.cached(getContext(), scene);
        if (file == null || Build.VERSION.SDK_INT < 28) return;
        new Thread(new Runnable() {
            @Override public void run() {
                final Drawable art;
                try {
                    art = ImageDecoder.decodeDrawable(ImageDecoder.createSource(file));
                } catch (Exception unreadable) {
                    OverlayLog.add("gift art " + scene + " cannot be shown: " + unreadable.getMessage());
                    return;
                }
                handler.post(new Runnable() {
                    @Override public void run() {
                        if (closed || card.getParent() == null) return;
                        showArt(art, card, emoji);
                    }
                });
            }
        }, "gift-art-decode").start();
    }

    private void showArt(Drawable art, LinearLayout card, TextView emoji) {
        int width = art.getIntrinsicWidth();
        int height = art.getIntrinsicHeight();
        if (width <= 0 || height <= 0) return;
        float scale = Math.min(ART_MAX_W_PX / (float) width, ART_MAX_H_PX / (float) height);
        int artWidth = Math.round(width * scale);
        int artHeight = Math.round(height * scale);
        FrameLayout box = new FrameLayout(getContext());
        View halo = new View(getContext());
        halo.setBackground(glow());
        box.addView(halo, new FrameLayout.LayoutParams(artWidth + HALO_EXTRA_PX, artHeight + HALO_EXTRA_PX, Gravity.CENTER));
        ImageView image = new ImageView(getContext());
        image.setImageDrawable(art);
        box.addView(image, new FrameLayout.LayoutParams(artWidth, artHeight, Gravity.CENTER));
        ObjectAnimator pulse = ObjectAnimator.ofPropertyValuesHolder(halo, PropertyValuesHolder.ofFloat("scaleX", 0.85f, 1.15f), PropertyValuesHolder.ofFloat("scaleY", 0.85f, 1.15f));
        pulse.setDuration(HALO_PULSE_MS);
        pulse.setRepeatCount(ObjectAnimator.INFINITE);
        pulse.setRepeatMode(ObjectAnimator.REVERSE);
        pulse.start();
        int index = card.indexOfChild(emoji);
        card.removeView(emoji);
        card.addView(box, index, new LinearLayout.LayoutParams(artWidth + HALO_EXTRA_PX, artHeight + HALO_EXTRA_PX));
        if (art instanceof AnimatedImageDrawable) {
            ((AnimatedImageDrawable) art).setRepeatCount(AnimatedImageDrawable.REPEAT_INFINITE);
            ((AnimatedImageDrawable) art).start();
        }
    }

    /** A soft golden glow that pulses behind the animation. */
    private static GradientDrawable glow() {
        GradientDrawable glow = new GradientDrawable();
        glow.setShape(GradientDrawable.OVAL);
        glow.setGradientType(GradientDrawable.RADIAL_GRADIENT);
        glow.setGradientRadius(HALO_RADIUS_PX);
        glow.setColors(new int[]{HALO_COLOUR, Color.argb(0, 252, 211, 77)});
        return glow;
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
