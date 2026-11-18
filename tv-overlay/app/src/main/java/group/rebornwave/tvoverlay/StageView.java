package group.rebornwave.tvoverlay;

import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Handler;
import android.os.Looper;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.util.List;

/**
 * What the player draws around the song video: while nothing is playing a lobby screen (the name, how to pick a song, the songs waiting as cards),
 * and over a playing song a lower-third "Now singing" card that fades out after a few seconds, a small "Next" line and short messages.
 */
final class StageView extends FrameLayout {
    private static final String BACKGROUND_TOP = "#2a0f55";
    private static final String BACKGROUND_BOTTOM = "#05010f";
    private static final String GOLD = "#fcd34d";
    private static final String CARD = "#33ffffff";
    private static final String LOWER_THIRD = "#cc12091f";
    private static final long LOWER_THIRD_MS = 8_000;
    private static final long MESSAGE_MS = 5_000;
    private static final long FADE_MS = 500;
    private static final int TITLE_SP = 60;
    private static final int HINT_SP = 26;
    private static final int CARD_TITLE_SP = 28;
    private static final int CARD_SMALL_SP = 20;
    private static final int LOWER_SP = 34;
    private static final int MAX_CARDS = 5;
    private static final int PADDING_DP = 48;
    private static final int RADIUS_DP = 20;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final LinearLayout lobby;
    private final LinearLayout cards;
    private final TextView hint;
    private final LinearLayout lowerThird;
    private final TextView lowerTitle;
    private final TextView lowerWho;
    private final TextView nextLine;
    private final TextView message;

    StageView(Context context) {
        super(context);
        lobby = column(context);
        lobby.setGravity(Gravity.CENTER_HORIZONTAL);
        lobby.setPadding(dp(PADDING_DP), dp(PADDING_DP), dp(PADDING_DP), dp(PADDING_DP));
        GradientDrawable background = new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, new int[]{Color.parseColor(BACKGROUND_TOP), Color.parseColor(BACKGROUND_BOTTOM)});
        lobby.setBackground(background);

        TextView title = text(context, "🎤  Reborn Karaoke", TITLE_SP, true, GOLD);
        title.setGravity(Gravity.CENTER);
        lobby.addView(title);
        hint = text(context, "", HINT_SP, false, "#ffffff");
        hint.setGravity(Gravity.CENTER);
        hint.setPadding(0, dp(8), 0, dp(24));
        lobby.addView(hint);
        cards = column(context);
        lobby.addView(cards, new LinearLayout.LayoutParams(dp(900), LayoutParams.WRAP_CONTENT));
        addView(lobby, new FrameLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));

        lowerThird = column(context);
        lowerThird.setPadding(dp(28), dp(16), dp(28), dp(16));
        lowerThird.setBackground(rounded(Color.parseColor(LOWER_THIRD), RADIUS_DP));
        lowerTitle = text(context, "", LOWER_SP, true, "#ffffff");
        lowerWho = text(context, "", CARD_SMALL_SP + 2, false, GOLD);
        lowerThird.addView(lowerTitle);
        lowerThird.addView(lowerWho);
        lowerThird.setVisibility(View.GONE);
        FrameLayout.LayoutParams lowerParams = new FrameLayout.LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT, Gravity.BOTTOM | Gravity.START);
        lowerParams.setMargins(dp(40), 0, 0, dp(40));
        addView(lowerThird, lowerParams);

        nextLine = text(context, "", CARD_SMALL_SP, false, "#ffffff");
        nextLine.setShadowLayer(8f, 0f, 0f, Color.BLACK);
        nextLine.setVisibility(View.GONE);
        FrameLayout.LayoutParams nextParams = new FrameLayout.LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT, Gravity.BOTTOM | Gravity.END);
        nextParams.setMargins(0, 0, dp(40), dp(40));
        addView(nextLine, nextParams);

        message = text(context, "", HINT_SP, true, "#ffffff");
        message.setGravity(Gravity.CENTER);
        message.setPadding(dp(24), dp(12), dp(24), dp(12));
        message.setBackground(rounded(Color.argb(210, 180, 30, 30), RADIUS_DP));
        message.setVisibility(View.GONE);
        FrameLayout.LayoutParams messageParams = new FrameLayout.LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT, Gravity.TOP | Gravity.CENTER_HORIZONTAL);
        messageParams.setMargins(0, dp(32), 0, 0);
        addView(message, messageParams);
    }

    /** The lobby, with the songs waiting as cards; `hintText` says how to pick a song (or what is wrong). */
    void showLobby(String hintText, List<QueueClient.Song> waiting) {
        handler.removeCallbacks(hideLowerThird);
        lowerThird.setVisibility(View.GONE);
        nextLine.setVisibility(View.GONE);
        lobby.setVisibility(View.VISIBLE);
        hint.setText(hintText);
        cards.removeAllViews();
        for (int i = 0; i < Math.min(waiting.size(), MAX_CARDS); i++) cards.addView(card(getContext(), i + 1, waiting.get(i)));
    }

    /** A song is playing: the lobby goes away and the "Now singing" card shows for a few seconds. */
    void showPlaying(QueueClient.Song now, QueueClient.Song next) {
        lobby.setVisibility(View.GONE);
        lowerTitle.setText(now.title + (now.artist.isEmpty() ? "" : " — " + now.artist));
        lowerWho.setText("🎤 " + Words.t("Now singing: ", "正在演唱：", "Sedang bernyanyi: ") + now.who());
        lowerThird.setAlpha(1f);
        lowerThird.setVisibility(View.VISIBLE);
        handler.removeCallbacks(hideLowerThird);
        handler.postDelayed(hideLowerThird, LOWER_THIRD_MS);
        setNext(next);
    }

    void setNext(QueueClient.Song next) {
        if (next == null) {
            nextLine.setVisibility(View.GONE);
            return;
        }
        nextLine.setText(Words.t("Next: ", "下一首：", "Berikutnya: ") + next.title + (next.who().isEmpty() ? "" : " · " + next.who()));
        nextLine.setVisibility(View.VISIBLE);
    }

    /** A short message over the picture, e.g. a song this box has no video for. */
    void flash(String text) {
        message.setText(text);
        message.setVisibility(View.VISIBLE);
        handler.removeCallbacks(hideMessage);
        handler.postDelayed(hideMessage, MESSAGE_MS);
    }

    void close() {
        handler.removeCallbacksAndMessages(null);
    }

    private final Runnable hideLowerThird = new Runnable() {
        @Override public void run() {
            lowerThird.animate().alpha(0f).setDuration(FADE_MS).withEndAction(new Runnable() {
                @Override public void run() { lowerThird.setVisibility(View.GONE); }
            }).start();
        }
    };

    private final Runnable hideMessage = new Runnable() {
        @Override public void run() { message.setVisibility(View.GONE); }
    };

    private View card(Context context, int number, QueueClient.Song song) {
        LinearLayout row = new LinearLayout(context);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(dp(20), dp(14), dp(20), dp(14));
        row.setBackground(rounded(Color.parseColor(CARD), RADIUS_DP));
        LinearLayout.LayoutParams spacing = new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
        spacing.setMargins(0, 0, 0, dp(12));
        row.setLayoutParams(spacing);

        TextView badge = text(context, String.valueOf(number), CARD_TITLE_SP, true, "#12091f");
        badge.setGravity(Gravity.CENTER);
        badge.setBackground(rounded(Color.parseColor(GOLD), RADIUS_DP * 2));
        row.addView(badge, new LinearLayout.LayoutParams(dp(52), dp(52)));

        LinearLayout words = column(context);
        words.setPadding(dp(20), 0, 0, 0);
        words.addView(text(context, song.title, CARD_TITLE_SP, true, "#ffffff"));
        String sub = (song.artist.isEmpty() ? "" : song.artist + "   ") + song.who();
        if (!sub.trim().isEmpty()) words.addView(text(context, sub, CARD_SMALL_SP, false, "#d9ccff"));
        row.addView(words);
        return row;
    }

    private static LinearLayout column(Context context) {
        LinearLayout column = new LinearLayout(context);
        column.setOrientation(LinearLayout.VERTICAL);
        return column;
    }

    private static TextView text(Context context, String value, int sp, boolean bold, String colour) {
        TextView view = new TextView(context);
        view.setText(value);
        view.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        view.setTextColor(Color.parseColor(colour));
        if (bold) view.setTypeface(Typeface.DEFAULT_BOLD);
        return view;
    }

    private GradientDrawable rounded(int colour, int radiusDp) {
        GradientDrawable shape = new GradientDrawable();
        shape.setColor(colour);
        shape.setCornerRadius(dp(radiusDp));
        return shape;
    }

    private int dp(int value) {
        return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value, getResources().getDisplayMetrics()));
    }
}
