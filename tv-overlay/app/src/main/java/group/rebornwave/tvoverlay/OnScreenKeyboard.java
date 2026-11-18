package group.rebornwave.tvoverlay;

import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;

/** A keyboard drawn by the app (numbers, letters, space, backspace, clear), for a box whose system has none. */
final class OnScreenKeyboard extends LinearLayout {
    interface Listener {
        void onKey(String letter);

        void onBackspace();

        void onClear();
    }

    private static final String[] ROWS = {"1234567890", "QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"};
    private static final String KEY_COLOUR = "#38ffffff";
    private static final String ACTION_COLOUR = "#fcd34d";
    private static final int KEY_SP = 20;
    private static final int RADIUS_DP = 10;
    private static final int GAP_DP = 3;

    private final Listener listener;

    OnScreenKeyboard(Context context, Listener listener) {
        super(context);
        this.listener = listener;
        setOrientation(VERTICAL);
        for (int r = 0; r < ROWS.length; r++) {
            LinearLayout row = newRow(context);
            for (char letter : ROWS[r].toCharArray()) row.addView(key(context, String.valueOf(letter), 1f, false, letterTap(String.valueOf(letter))));
            if (r == ROWS.length - 1) row.addView(key(context, "⌫", 1.6f, true, new Runnable() { @Override public void run() { OnScreenKeyboard.this.listener.onBackspace(); } }));
            addView(row, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, 0, 1f));
        }
        LinearLayout last = newRow(context);
        last.addView(key(context, Words.t("Clear", "清除", "Hapus"), 2f, true, new Runnable() { @Override public void run() { OnScreenKeyboard.this.listener.onClear(); } }));
        last.addView(key(context, Words.t("Space", "空格", "Spasi"), 5f, false, letterTap(" ")));
        addView(last, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, 0, 1f));
    }

    private Runnable letterTap(final String letter) {
        return new Runnable() {
            @Override public void run() { listener.onKey(letter); }
        };
    }

    private LinearLayout newRow(Context context) {
        LinearLayout row = new LinearLayout(context);
        row.setOrientation(HORIZONTAL);
        return row;
    }

    private View key(Context context, String label, float weight, boolean isAction, final Runnable onTap) {
        TextView key = new TextView(context);
        key.setText(label);
        key.setTextSize(TypedValue.COMPLEX_UNIT_SP, KEY_SP);
        key.setTypeface(Typeface.DEFAULT_BOLD);
        key.setGravity(Gravity.CENTER);
        key.setTextColor(Color.parseColor(isAction ? "#1b1130" : "#ffffff"));
        GradientDrawable shape = new GradientDrawable();
        shape.setColor(Color.parseColor(isAction ? ACTION_COLOUR : KEY_COLOUR));
        shape.setCornerRadius(dp(RADIUS_DP));
        key.setBackground(shape);
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(0, LayoutParams.MATCH_PARENT, weight);
        params.setMargins(dp(GAP_DP), dp(GAP_DP), dp(GAP_DP), dp(GAP_DP));
        key.setLayoutParams(params);
        key.setOnClickListener(new OnClickListener() {
            @Override public void onClick(View view) { onTap.run(); }
        });
        return key;
    }

    private int dp(int value) {
        return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value, getResources().getDisplayMetrics()));
    }
}
