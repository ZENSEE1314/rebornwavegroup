package group.rebornwave.tvoverlay;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Outline;
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
import android.view.ViewOutlineProvider;
import android.view.animation.LinearInterpolator;
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
    private static final long SHOW_MS = 14_000; // long enough for the words to cross the screen slowly
    private static final long POP_MS = 500;
    private static final long FALL_MS = 3_500;
    private static final long RAIN_SPREAD_MS = 2_500;
    private static final int RAIN_COUNT = 18;
    private static final int RAIN_SP = 32;
    private static final float EMOJI_HEIGHT_FRACTION = 0.3f; // a gift with no picture or animation shows its emoji this big (of the screen height)
    private static final int BAR_SP = 26;
    private static final float PICTURE_HEIGHT_FRACTION = 0.3f; // a gift picture of its own
    private static final int FALLBACK_WIDTH_PX = 1280;
    private static final int FALLBACK_HEIGHT_PX = 720;
    private static final int MAX_WAITING_GIFTS = 12;
    private static final int PICTURE_TIMEOUT_MS = 6_000;
    private static final String DEFAULT_EMOJI = "🎁";
    private static final int GREY_BOX = Color.argb(185, 55, 55, 55); // see-through grey behind the words
    private static final int WORDS_PAD_PX = 36;
    // Pictures are sized as a share of the screen, so they look the same on any TV.
    private static final float ART_WIDTH_FRACTION = 0.26f;
    private static final float ART_HEIGHT_FRACTION = 0.32f;
    private static final float POSTER_WIDTH_FRACTION = 0.3f;
    private static final float POSTER_HEIGHT_FRACTION = 0.5f;
    private static final float POSTER_CORNER_FRACTION = 0.05f; // of the poster width
    private static final float FLOAT_FRACTION = 0.018f; // how far a picture floats up and down, of the screen height
    private static final float BREATHE_SCALE = 1.04f;
    private static final long FLOAT_MS = 1_500;
    private static final int SPARKLES = 8;
    private static final int SPARKLE_SP = 26;
    private static final long SPARKLE_MS = 900;
    private static final float HALO_EXTRA_FRACTION = 0.25f; // the glow is this much bigger than the animation
    private static final int TICKER_SP = 32;
    private static final int TICKER_TOP_PX = 80; // below the line the karaoke program keeps at the top of its picture
    private static final int CARD_TOP_PX = 110; // the picture sits a little below the middle, clear of the moving words
    private static final int TOP_TITLE_SP = 22;
    private static final int TOP_NAME_SP = 28;
    private static final int TOP_PANEL_TOP_PX = 260; // below the moving words
    private static final int TOP_PANEL_MARGIN_PX = 32;
    private static final float TOP_PANEL_MAX_WIDTH_FRACTION = 0.26f;
    private static final String[] MEDALS = {"🥇", "🥈", "🥉"};
    private static final int[] MEDAL_COLOURS = {Color.parseColor("#f7d774"), Color.parseColor("#d1d5db"), Color.parseColor("#d97706")};
    private static final int FACE_PX = 72;
    private static final int FACE_RING_PX = 5;
    private static final int TOP_ROW_GAP_PX = 8;
    private static final int FACE_LETTER_SP = 30;
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
        final TextView picture = text(emoji, 1, false);
        picture.setTextSize(TypedValue.COMPLEX_UNIT_PX, screenHeight() * EMOJI_HEIGHT_FRACTION);
        card.addView(picture);
        startFloat(picture);
        FrameLayout.LayoutParams cardParams = new FrameLayout.LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT, Gravity.CENTER);
        cardParams.topMargin = CARD_TOP_PX;
        stage.addView(card, cardParams);
        addTicker(gift);
        addTopGifters(gift, Gravity.START);
        addTopGifters(gift, Gravity.END);
        card.setScaleX(0f);
        card.setScaleY(0f);
        card.animate().scaleX(1f).scaleY(1f).setDuration(POP_MS).setInterpolator(new OvershootInterpolator()).start();

        // What is shown is what was sent: the club's own clip (lion, whale, car, teddy), one of the club's two posters (hearts, gift boxes), the gift's own
        // picture, else the animation of the very emoji it was sent with.
        String scene = GiftArt.sceneOf(gift);
        if (GiftArt.isClubClip(scene)) loadAnimated(gift, scene, card, picture);
        else if (GiftArt.isPoster(scene)) loadPoster(scene, card, picture);
        else if (!gift.imageUrl.isEmpty()) loadPicture(gift.imageUrl, card, picture);
        else loadAnimated(gift, scene, card, picture);
        rain(emoji);
    }

    /** The receiver's top 3 givers as a small board on one side of the picture (called for the left and the right side). */
    private void addTopGifters(TvFeed.Gift gift, int side) {
        if (gift.topGifters.isEmpty()) return;
        LinearLayout panel = new LinearLayout(getContext());
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setBackgroundColor(GREY_BOX);
        panel.setPadding(WORDS_PAD_PX / 2, WORDS_PAD_PX / 3, WORDS_PAD_PX / 2, WORDS_PAD_PX / 3);
        TextView title = text("🏆 " + Words.t("Top 3 gifters of ", "送礼前三名：", "3 pemberi teratas untuk ") + (gift.toName.isEmpty() ? "—" : gift.toName), TOP_TITLE_SP, true);
        title.setGravity(Gravity.START);
        title.setMaxWidth((int) (screenWidth() * TOP_PANEL_MAX_WIDTH_FRACTION));
        panel.addView(title);
        for (int i = 0; i < gift.topGifters.size() && i < MEDALS.length; i++) {
            String[] giver = gift.topGifters.get(i);
            LinearLayout row = new LinearLayout(getContext());
            row.setOrientation(LinearLayout.HORIZONTAL);
            row.setGravity(Gravity.CENTER_VERTICAL);
            row.setPadding(0, TOP_ROW_GAP_PX, 0, 0);
            row.addView(face(giver[0], giver[1], MEDAL_COLOURS[i]));
            TextView name = text(MEDALS[i] + " " + giver[0], TOP_NAME_SP, true);
            name.setGravity(Gravity.START);
            name.setSingleLine(true);
            name.setEllipsize(TextUtils.TruncateAt.END);
            name.setPadding(TOP_ROW_GAP_PX * 2, 0, 0, 0);
            name.setMaxWidth((int) (screenWidth() * TOP_PANEL_MAX_WIDTH_FRACTION));
            row.addView(name);
            panel.addView(row);
        }
        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT, Gravity.TOP | side);
        params.topMargin = TOP_PANEL_TOP_PX;
        if (side == Gravity.START) params.leftMargin = TOP_PANEL_MARGIN_PX; else params.rightMargin = TOP_PANEL_MARGIN_PX;
        stage.addView(panel, params);
    }

    /** A round picture of a giver inside a gold / silver / bronze ring: their first letter until the picture has loaded (or when they have none). */
    private View face(String name, final String photo, int ring) {
        final FrameLayout frame = new FrameLayout(getContext());
        GradientDrawable disc = new GradientDrawable();
        disc.setShape(GradientDrawable.OVAL);
        disc.setColor(Color.argb(200, 90, 90, 110));
        disc.setStroke(FACE_RING_PX, ring);
        frame.setBackground(disc);
        frame.setClipToOutline(true);
        frame.setOutlineProvider(ViewOutlineProvider.BACKGROUND);
        frame.addView(text(name.isEmpty() ? "?" : name.substring(0, name.offsetByCodePoints(0, 1)).toUpperCase(), FACE_LETTER_SP, true),
                new FrameLayout.LayoutParams(FACE_PX, FACE_PX, Gravity.CENTER));
        frame.setLayoutParams(new LinearLayout.LayoutParams(FACE_PX, FACE_PX));
        if (photo != null && !photo.isEmpty()) {
            new Thread(new Runnable() {
                @Override public void run() {
                    final Bitmap bitmap = faceBitmap(photo);
                    if (bitmap == null) return;
                    handler.post(new Runnable() {
                        @Override public void run() {
                            if (closed || frame.getParent() == null) return;
                            ImageView picture = new ImageView(getContext());
                            picture.setImageBitmap(bitmap);
                            picture.setScaleType(ImageView.ScaleType.CENTER_CROP);
                            frame.addView(picture, new FrameLayout.LayoutParams(FACE_PX, FACE_PX));
                        }
                    });
                }
            }, "gift-face").start();
        }
        return frame;
    }

    /** A member's picture: a full web address, a path on the app's own server, or the picture itself inside the address (data:image/…;base64,…). */
    private Bitmap faceBitmap(String photo) {
        try {
            if (photo.startsWith("data:")) {
                int comma = photo.indexOf(',');
                if (comma < 0) return null;
                byte[] bytes = android.util.Base64.decode(photo.substring(comma + 1), android.util.Base64.DEFAULT);
                return BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
            }
            if (photo.startsWith("/")) return fetch(Link.server(getContext()) + photo);
            return fetch(photo);
        } catch (Exception unreadable) {
            return null;
        }
    }

    /** The sender, the receiver, the gift and its KGOLD as one line on a see-through grey strip that slides across the screen from left to right. */
    private void addTicker(TvFeed.Gift gift) {
        final FrameLayout strip = new FrameLayout(getContext());
        strip.setBackgroundColor(GREY_BOX);
        final TextView line = text(who(gift) + "   ·   " + gift.name + (gift.kgold > 0 ? "   ·   " + gift.kgold + " KGOLD" : ""), TICKER_SP, true);
        line.setSingleLine(true);
        line.setPadding(WORDS_PAD_PX, WORDS_PAD_PX / 3, WORDS_PAD_PX, WORDS_PAD_PX / 3);
        strip.addView(line, new FrameLayout.LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT, Gravity.START | Gravity.CENTER_VERTICAL));
        FrameLayout.LayoutParams stripParams = new FrameLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT, Gravity.TOP);
        stripParams.topMargin = TICKER_TOP_PX;
        stage.addView(strip, stripParams);
        strip.post(new Runnable() {
            @Override public void run() {
                int screenWidth = strip.getWidth() > 0 ? strip.getWidth() : FALLBACK_WIDTH_PX;
                line.measure(View.MeasureSpec.UNSPECIFIED, View.MeasureSpec.UNSPECIFIED);
                line.setTranslationX(-line.getMeasuredWidth());
                line.animate().translationX(screenWidth).setDuration(SHOW_MS - POP_MS).setInterpolator(new LinearInterpolator()).start();
            }
        });
    }

    /**
     * Replaces the emoji with an animated picture (Android 9 and newer): the club's clip for its own scenes, else the animation of the gift's own emoji,
     * else the one of its kind of scene. Until it is there, or when there is none, the emoji stays.
     */
    private void loadAnimated(final TvFeed.Gift gift, final String scene, final LinearLayout card, final TextView emoji) {
        if (Build.VERSION.SDK_INT < 28) return;
        new Thread(new Runnable() {
            @Override public void run() {
                File found = GiftArt.isClubClip(scene) ? GiftArt.cached(getContext(), scene) : GiftArt.emojiClip(getContext(), gift.emoji);
                if (found == null && !scene.isEmpty()) found = GiftArt.cached(getContext(), scene);
                if (found == null) return;
                final File file = found;
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

    private int screenWidth() {
        return getWidth() > 0 ? getWidth() : FALLBACK_WIDTH_PX;
    }

    private int screenHeight() {
        return getHeight() > 0 ? getHeight() : FALLBACK_HEIGHT_PX;
    }

    private void showArt(Drawable art, LinearLayout card, TextView emoji) {
        int width = art.getIntrinsicWidth();
        int height = art.getIntrinsicHeight();
        if (width <= 0 || height <= 0) return;
        float scale = Math.min(screenWidth() * ART_WIDTH_FRACTION / width, screenHeight() * ART_HEIGHT_FRACTION / height);
        int artWidth = Math.round(width * scale);
        int artHeight = Math.round(height * scale);
        FrameLayout box = new FrameLayout(getContext());
        View halo = new View(getContext());
        int haloExtra = Math.round(Math.max(artWidth, artHeight) * HALO_EXTRA_FRACTION);
        halo.setBackground(glow(Math.max(artWidth, artHeight) / 2f + haloExtra));
        box.addView(halo, new FrameLayout.LayoutParams(artWidth + haloExtra, artHeight + haloExtra, Gravity.CENTER));
        ImageView image = new ImageView(getContext());
        image.setImageDrawable(art);
        box.addView(image, new FrameLayout.LayoutParams(artWidth, artHeight, Gravity.CENTER));
        pulseGlow(halo);
        int index = card.indexOfChild(emoji);
        card.removeView(emoji);
        card.addView(box, index, new LinearLayout.LayoutParams(artWidth + haloExtra, artHeight + haloExtra));
        if (art instanceof AnimatedImageDrawable) {
            ((AnimatedImageDrawable) art).setRepeatCount(AnimatedImageDrawable.REPEAT_INFINITE);
            ((AnimatedImageDrawable) art).start();
        }
    }

    /** Floats a view gently up and down and "breathes" it a little bigger and smaller, so a still picture feels alive. */
    private void startFloat(View view) {
        float rise = screenHeight() * FLOAT_FRACTION;
        ObjectAnimator bob = ObjectAnimator.ofPropertyValuesHolder(view,
                PropertyValuesHolder.ofFloat("translationY", rise, -rise),
                PropertyValuesHolder.ofFloat("scaleX", 1f, BREATHE_SCALE),
                PropertyValuesHolder.ofFloat("scaleY", 1f, BREATHE_SCALE));
        bob.setDuration(FLOAT_MS);
        bob.setRepeatCount(ObjectAnimator.INFINITE);
        bob.setRepeatMode(ObjectAnimator.REVERSE);
        bob.start();
    }

    /** A still picture (a poster, or a gift's own picture) in a glowing, floating frame; a poster gets rounded corners and twinkling sparkles. */
    private void showBitmap(Bitmap bitmap, LinearLayout card, TextView emoji, boolean isPoster) {
        int width = bitmap.getWidth();
        int height = bitmap.getHeight();
        if (width <= 0 || height <= 0) return;
        float maxWidth = screenWidth() * (isPoster ? POSTER_WIDTH_FRACTION : PICTURE_HEIGHT_FRACTION);
        float maxHeight = screenHeight() * (isPoster ? POSTER_HEIGHT_FRACTION : PICTURE_HEIGHT_FRACTION);
        float scale = Math.min(maxWidth / width, maxHeight / height);
        int pictureWidth = Math.round(width * scale);
        int pictureHeight = Math.round(height * scale);
        int haloExtra = Math.round(Math.max(pictureWidth, pictureHeight) * HALO_EXTRA_FRACTION);

        FrameLayout box = new FrameLayout(getContext());
        View halo = new View(getContext());
        halo.setBackground(glow(Math.max(pictureWidth, pictureHeight) / 2f + haloExtra));
        box.addView(halo, new FrameLayout.LayoutParams(pictureWidth + haloExtra, pictureHeight + haloExtra, Gravity.CENTER));
        ImageView image = new ImageView(getContext());
        image.setImageBitmap(bitmap);
        image.setScaleType(ImageView.ScaleType.FIT_CENTER);
        if (isPoster) {
            final float corner = pictureWidth * POSTER_CORNER_FRACTION;
            image.setOutlineProvider(new ViewOutlineProvider() {
                @Override public void getOutline(View view, Outline outline) { outline.setRoundRect(0, 0, view.getWidth(), view.getHeight(), corner); }
            });
            image.setClipToOutline(true);
        }
        box.addView(image, new FrameLayout.LayoutParams(pictureWidth, pictureHeight, Gravity.CENTER));
        pulseGlow(halo);
        if (isPoster) addSparkles(box, pictureWidth + haloExtra, pictureHeight + haloExtra);
        int index = card.indexOfChild(emoji);
        card.removeView(emoji);
        card.addView(box, index, new LinearLayout.LayoutParams(pictureWidth + haloExtra, pictureHeight + haloExtra));
        startFloat(box);
    }

    private void pulseGlow(View halo) {
        ObjectAnimator pulse = ObjectAnimator.ofPropertyValuesHolder(halo, PropertyValuesHolder.ofFloat("scaleX", 0.85f, 1.15f), PropertyValuesHolder.ofFloat("scaleY", 0.85f, 1.15f));
        pulse.setDuration(HALO_PULSE_MS);
        pulse.setRepeatCount(ObjectAnimator.INFINITE);
        pulse.setRepeatMode(ObjectAnimator.REVERSE);
        pulse.start();
    }

    /** A few sparkles that fade in and out at random places around a poster. */
    private void addSparkles(FrameLayout box, int width, int height) {
        for (int i = 0; i < SPARKLES; i++) {
            TextView sparkle = text("✨", SPARKLE_SP, false);
            FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT, Gravity.TOP | Gravity.START);
            params.leftMargin = random.nextInt(Math.max(1, width));
            params.topMargin = random.nextInt(Math.max(1, height));
            box.addView(sparkle, params);
            sparkle.setAlpha(0f);
            ObjectAnimator twinkle = ObjectAnimator.ofFloat(sparkle, "alpha", 0f, 1f);
            twinkle.setDuration(SPARKLE_MS);
            twinkle.setStartDelay(random.nextInt((int) SPARKLE_MS * 2));
            twinkle.setRepeatCount(ObjectAnimator.INFINITE);
            twinkle.setRepeatMode(ObjectAnimator.REVERSE);
            twinkle.start();
        }
    }

    /** A club poster (hearts, gift boxes) replaces the emoji once the box has it. */
    private void loadPoster(final String scene, final LinearLayout card, final TextView emoji) {
        new Thread(new Runnable() {
            @Override public void run() {
                File file = GiftArt.poster(getContext(), scene);
                final Bitmap bitmap = file == null ? null : BitmapFactory.decodeFile(file.getPath());
                if (bitmap == null) return;
                handler.post(new Runnable() {
                    @Override public void run() {
                        if (closed || card.getParent() == null) return;
                        showBitmap(bitmap, card, emoji, true);
                    }
                });
            }
        }, "gift-poster").start();
    }

    /** A soft golden glow that pulses behind the animation. */
    private static GradientDrawable glow(float radius) {
        GradientDrawable glow = new GradientDrawable();
        glow.setShape(GradientDrawable.OVAL);
        glow.setGradientType(GradientDrawable.RADIAL_GRADIENT);
        glow.setGradientRadius(radius);
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
                        showBitmap(bitmap, card, emoji, false);
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
