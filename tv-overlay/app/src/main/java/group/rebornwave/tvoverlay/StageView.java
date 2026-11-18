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
    private static final String EMPTY_BOX = "#14ffffff";
    private static final String LOWER_THIRD = "#cc12091f";
    private static final long LOWER_THIRD_MS = 8_000;
    private static final long MESSAGE_MS = 5_000;
    private static final long FADE_MS = 500;
    private static final int TITLE_SP = 40;
    private static final int HINT_SP = 22;
    private static final int CARD_SMALL_SP = 20;
    private static final int LOWER_SP = 34;
    private static final int OPAQUE_ALPHA = 255;
    private static final int BOARD_ALPHA = 225;
    private static final long BOARD_SHOW_MS = 12_000;
    private static final int COLUMNS = 4;
    private static final int ROWS = 3; // COLUMNS x ROWS = the 12 table boxes
    private static final int MAX_SONGS_PER_BOX = 5;
    private static final int BOX_TITLE_SP = 22;
    private static final int BOX_SONG_SP = 17;
    private static final int BOX_GAP_DP = 10;
    private static final int PADDING_DP = 28;
    private static final int RADIUS_DP = 20;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final LinearLayout lobby;
    private final LinearLayout grid;
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
        grid = column(context);
        lobby.addView(grid, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, 0, 1f));
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

    /**
     * The lobby: 12 boxes, one per table, each listing every song of that table (the number in front is the song's place in the whole queue, which
     * gives each table its turns one round at a time). Tables are ordered by who sings first; `hintText` says how to pick a song (or what is wrong).
     */
    void showLobby(String hintText, QueueClient.Song now, List<QueueClient.Song> waiting) {
        handler.removeCallbacks(hideLowerThird);
        lowerThird.setVisibility(View.GONE);
        nextLine.setVisibility(View.GONE);
        handler.removeCallbacks(hideBoard);
        lobby.getBackground().setAlpha(OPAQUE_ALPHA);
        lobby.setVisibility(View.VISIBLE);
        hint.setText(hintText);
        fillGrid(now, waiting);
    }

    /** While a song plays: the same 12 boxes over the picture for a few seconds, so every table can see where its songs are in the queue. */
    void showBoard(QueueClient.Song now, List<QueueClient.Song> waiting) {
        if (waiting.isEmpty()) return;
        lobby.getBackground().setAlpha(BOARD_ALPHA);
        hint.setText("");
        fillGrid(now, waiting);
        lobby.setVisibility(View.VISIBLE);
        handler.removeCallbacks(hideBoard);
        handler.postDelayed(hideBoard, BOARD_SHOW_MS);
    }

    private final Runnable hideBoard = new Runnable() {
        @Override public void run() { lobby.setVisibility(View.GONE); }
    };

    private void fillGrid(QueueClient.Song now, List<QueueClient.Song> waiting) {
        grid.removeAllViews();
        List<List<QueueClient.Song>> tables = TableBoxes.group(now, waiting, COLUMNS * ROWS);
        for (int row = 0; row < ROWS; row++) {
            LinearLayout line = new LinearLayout(getContext());
            line.setOrientation(LinearLayout.HORIZONTAL);
            for (int column = 0; column < COLUMNS; column++) {
                int index = row * COLUMNS + column;
                line.addView(tableBox(getContext(), index < tables.size() ? tables.get(index) : null, now));
            }
            grid.addView(line, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, 0, 1f));
        }
    }

    /** A song is playing: the lobby goes away and the "Now singing" card shows for a few seconds. */
    void showPlaying(QueueClient.Song now, QueueClient.Song next) {
        handler.removeCallbacks(hideBoard);
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

    /** One table's box: its name and song count, then every song of the table (the one on now marked 🎤). A null table is an empty, dimmed box. */
    private View tableBox(Context context, List<QueueClient.Song> songs, QueueClient.Song now) {
        LinearLayout box = column(context);
        box.setPadding(dp(14), dp(10), dp(14), dp(10));
        box.setBackground(rounded(songs == null ? Color.parseColor(EMPTY_BOX) : Color.parseColor(CARD), RADIUS_DP));
        LinearLayout.LayoutParams size = new LinearLayout.LayoutParams(0, LayoutParams.MATCH_PARENT, 1f);
        size.setMargins(dp(BOX_GAP_DP / 2), dp(BOX_GAP_DP / 2), dp(BOX_GAP_DP / 2), dp(BOX_GAP_DP / 2));
        box.setLayoutParams(size);
        if (songs == null) return box;

        TextView head = text(context, TableBoxes.label(songs.get(0)) + "  ·  " + songs.size() + " " + Words.t(songs.size() == 1 ? "song" : "songs", "首", "lagu"), BOX_TITLE_SP, true, GOLD);
        head.setSingleLine(true);
        box.addView(head);
        for (int i = 0; i < Math.min(songs.size(), MAX_SONGS_PER_BOX); i++) {
            QueueClient.Song song = songs.get(i);
            boolean singing = now != null && song.id == now.id;
            TextView line = text(context, (singing ? "🎤 " : song.position + ". ") + song.title, BOX_SONG_SP, singing, singing ? GOLD : "#ffffff");
            line.setSingleLine(true);
            line.setEllipsize(android.text.TextUtils.TruncateAt.END);
            box.addView(line);
        }
        if (songs.size() > MAX_SONGS_PER_BOX) box.addView(text(context, "+" + (songs.size() - MAX_SONGS_PER_BOX), BOX_SONG_SP, false, "#d9ccff"));
        return box;
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
