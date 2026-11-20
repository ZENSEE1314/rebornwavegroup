package group.rebornwave.tvoverlay;

import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Handler;
import android.os.Looper;
import android.graphics.Outline;
import android.text.TextUtils;
import android.util.TypedValue;
import android.view.GestureDetector;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewOutlineProvider;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * The box's own touch screen. Top: a box for every table the admin set up (scroll down for more tables; each box lists all the songs of its table
 * and scrolls when it has more than fit). Tap a table, then choose how to find a song: Singers, Song title, Top songs, New songs, and tap Sing.
 * Bottom, always there: Mute, Volume, Tone, Play, Skip, Replay and Analog (the singer's own voice).
 */
final class ControlPanel extends LinearLayout {
    /** Where the songs come from; every call may read files or the network, so the panel calls them off the screen's own thread. */
    interface Catalog {
        List<SongPick> search(String text) throws Exception;

        /** The singers whose name (or pinyin letters) holds the text; with no text, the first ones of the list. */
        List<String> singers(String text) throws Exception;

        List<SongPick> songsOf(String singer) throws Exception;

        List<SongPick> top() throws Exception;

        List<SongPick> fresh() throws Exception;

        /** Where the songs come from, in words, for the messages of an empty list. */
        String source();

        /** Why the last list may be empty although something matched (songs left out), or "". */
        String whyEmpty();
    }

    /** What the buttons do. `onRequest` puts the song in the queue for the table and returns the sentence to show the person. */
    interface Actions {
        void onMute();

        void onVolume(int direction);

        void onTone(int direction);

        void onPlay();

        void onSkip();

        void onReplay();

        void onAnalog();

        String onRequest(String table, SongPick pick) throws Exception;
    }

    private enum Way { SINGERS, TITLE, TOP, FRESH }

    private static final String GOLD = "#fcd34d";
    private static final String CARD = "#2effffff";
    private static final String CARD_ON = "#55fcd34d";
    private static final String SOFT = "#d9ccff";
    private static final int COLUMNS = 4;
    private static final int SEARCH_WIDTH_DP = 380;
    private static final int PHOTO_DP = 56;
    private static final int BOX_HEIGHT_DP = 132;
    private static final int BAR_HEIGHT_DP = 72;
    private static final int RADIUS_DP = 16;
    private static final long SEARCH_DELAY_MS = 450;
    private static final long MESSAGE_MS = 4_000;
    private static final int MAX_TONE = 6;
    private static final int DEFAULT_TABLES = 12;
    private static final int LENGTH_ANY = 0;
    private static final int MAX_LENGTH = 6; // the last chip means 6 and more
    private static final String LANGUAGE_ALL = "all";
    private static final String LANGUAGE_CHINESE = "zh";
    private static final String LANGUAGE_ENGLISH = "en";
    private static final String LANGUAGE_JAPANESE = "ja";
    private static final String LANGUAGE_KOREAN = "ko";

    private final Handler ui = new Handler(Looper.getMainLooper());
    private final Catalog catalog;
    private final Actions actions;
    private final ScrollView tablesScroll;
    private final LinearLayout tablesColumn;
    private final LinearLayout middle;
    private final TextView nowLine; // the song on now and the next one: shown here, on our own screen, and not over the karaoke picture
    private final TextView message;
    private final TextView status;
    private final TextView info;
    private final TextView muteButton;
    private final TextView playButton;
    private final TextView analogButton;
    private final TextView toneValue;
    private String selected = null;
    private String signature = "";
    private List<String> tableNames = new ArrayList<String>();
    private Map<String, List<QueueClient.Song>> songsByTable = new LinkedHashMap<String, List<QueueClient.Song>>();
    private int loadId = 0;
    private final Map<String, LinearLayout> boxViews = new HashMap<String, LinearLayout>();
    private final SingerPhotos photos;
    private final StringBuilder typed = new StringBuilder();
    private TextView searchBox;

    ControlPanel(Context context, Catalog catalog, Actions actions, SingerPhotos photos) {
        super(context);
        this.catalog = catalog;
        this.actions = actions;
        this.photos = photos;
        setOrientation(VERTICAL);
        setBackground(new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, new int[]{Color.parseColor("#1b0b3a"), Color.parseColor("#080312")}));
        setPadding(dp(16), dp(10), dp(16), 0);

        nowLine = text(context, "", 20, true, GOLD);
        nowLine.setSingleLine(true);
        nowLine.setEllipsize(TextUtils.TruncateAt.MARQUEE);
        nowLine.setMarqueeRepeatLimit(-1);
        nowLine.setSelected(true); // a marquee only scrolls in a selected view
        nowLine.setPadding(dp(14), dp(6), dp(14), dp(8));
        nowLine.setBackground(rounded(Color.parseColor(CARD), RADIUS_DP));
        nowLine.setVisibility(GONE);
        LinearLayout.LayoutParams nowParams = new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
        nowParams.setMargins(0, 0, 0, dp(6));
        addView(nowLine, nowParams);

        tablesColumn = new LinearLayout(context);
        tablesColumn.setOrientation(VERTICAL);
        tablesScroll = new ScrollView(context);
        tablesScroll.setVerticalScrollBarEnabled(true);
        tablesScroll.setScrollbarFadingEnabled(false);
        tablesScroll.addView(tablesColumn);
        addView(tablesScroll, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, 0, 1f));

        middle = new LinearLayout(context);
        middle.setOrientation(VERTICAL);
        addView(middle, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, 0, 1f));

        message = text(context, "", 20, true, GOLD);
        message.setGravity(Gravity.CENTER);
        message.setVisibility(GONE);
        addView(message);

        info = text(context, "", 16, true, SOFT);
        info.setGravity(Gravity.CENTER);
        info.setVisibility(GONE);
        addView(info);

        status = text(context, "", 18, true, "#ffb4b4");
        status.setGravity(Gravity.CENTER);
        status.setVisibility(GONE);
        addView(status);

        LinearLayout bar = new LinearLayout(context);
        bar.setOrientation(HORIZONTAL);
        muteButton = barButton(bar, "🔇", Words.t("Mute", "静音", "Bisu"), new Runnable() { @Override public void run() { ControlPanel.this.actions.onMute(); } });
        barButton(bar, "🔉", Words.t("Volume −", "音量 −", "Volume −"), new Runnable() { @Override public void run() { ControlPanel.this.actions.onVolume(-1); } });
        barButton(bar, "🔊", Words.t("Volume +", "音量 +", "Volume +"), new Runnable() { @Override public void run() { ControlPanel.this.actions.onVolume(1); } });
        barButton(bar, "♭", Words.t("Tone −", "降调", "Nada −"), new Runnable() { @Override public void run() { ControlPanel.this.actions.onTone(-1); } });
        toneValue = barButton(bar, "0", Words.t("Key", "调", "Kunci"), null);
        barButton(bar, "♯", Words.t("Tone +", "升调", "Nada +"), new Runnable() { @Override public void run() { ControlPanel.this.actions.onTone(1); } });
        playButton = barButton(bar, "⏸", Words.t("Pause", "暂停", "Jeda"), new Runnable() { @Override public void run() { ControlPanel.this.actions.onPlay(); } });
        barButton(bar, "⏭", Words.t("Skip", "切歌", "Lewati"), new Runnable() { @Override public void run() { ControlPanel.this.actions.onSkip(); } });
        barButton(bar, "🔁", Words.t("Replay", "重唱", "Ulang"), new Runnable() { @Override public void run() { ControlPanel.this.actions.onReplay(); } });
        analogButton = barButton(bar, "🎤", Words.t("Analog", "原唱", "Analog"), new Runnable() { @Override public void run() { ControlPanel.this.actions.onAnalog(); } });
        addView(bar, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, dp(BAR_HEIGHT_DP)));

        showHome();
        update(new ArrayList<String>(), new QueueClient.Board()); // the table boxes show at once, before the app has answered
    }

    /** The tables (as the admin set them, in order) with the songs of each in the queue. Rebuilds only when something changed, keeping the scroll place. */
    void update(List<String> adminTables, QueueClient.Board board) {
        showNowAndNext(board);
        Map<String, List<QueueClient.Song>> byTable = new LinkedHashMap<String, List<QueueClient.Song>>();
        List<String> names = new ArrayList<String>(adminTables);
        if (names.isEmpty()) for (int number = 1; number <= DEFAULT_TABLES; number++) names.add(String.valueOf(number)); // no tables set up yet: Table 1 to 12
        List<QueueClient.Song> all = new ArrayList<QueueClient.Song>();
        if (board.now != null) all.add(board.now);
        all.addAll(board.queue);
        for (QueueClient.Song song : all) {
            String key = tableKey(song);
            if (!names.contains(key)) names.add(key);
            if (!byTable.containsKey(key)) byTable.put(key, new ArrayList<QueueClient.Song>());
            byTable.get(key).add(song);
        }
        String fresh = names + "|" + signatureOf(byTable);
        if (fresh.equals(signature)) return;
        signature = fresh;
        tableNames = names;
        songsByTable = byTable;
        final int keep = tablesScroll.getScrollY();
        buildTables(board.now);
        tablesScroll.post(new Runnable() {
            @Override public void run() { tablesScroll.scrollTo(0, keep); }
        });
    }

    private void showNowAndNext(QueueClient.Board board) {
        StringBuilder line = new StringBuilder();
        if (board.now != null) line.append("🎤 ").append(Words.t("Now singing: ", "正在演唱：", "Sedang bernyanyi: ")).append(songText(board.now));
        if (!board.queue.isEmpty()) {
            if (line.length() > 0) line.append("        ");
            line.append(Words.t("Next: ", "下一首：", "Berikutnya: ")).append(songText(board.queue.get(0)));
        }
        nowLine.setText(line.toString());
        nowLine.setVisibility(line.length() == 0 ? GONE : VISIBLE);
    }

    private static String songText(QueueClient.Song song) {
        String who = song.who();
        return song.title + (song.artist.isEmpty() ? "" : " — " + song.artist) + (who.isEmpty() ? "" : " (" + who + ")");
    }

    /** Shows what the buttons are doing now: muted, paused, the singer's own voice on, and the key change in semitones. */
    void showState(boolean muted, boolean paused, boolean analog, int tone) {
        muteButton.setBackground(rounded(Color.parseColor(muted ? GOLD : CARD), RADIUS_DP));
        muteButton.setTextColor(Color.parseColor(muted ? "#1b1130" : "#ffffff"));
        playButton.setText((paused ? "▶" : "⏸") + "\n" + (paused ? Words.t("Play", "播放", "Putar") : Words.t("Pause", "暂停", "Jeda")));
        playButton.setBackground(rounded(Color.parseColor(paused ? GOLD : CARD), RADIUS_DP));
        playButton.setTextColor(Color.parseColor(paused ? "#1b1130" : "#ffffff"));
        analogButton.setBackground(rounded(Color.parseColor(analog ? "#7c3aed" : CARD), RADIUS_DP));
        toneValue.setText((tone > 0 ? "+" : "") + tone + "\n" + Words.t("Key", "调", "Kunci"));
    }

    static int maxTone() {
        return MAX_TONE;
    }

    /** A small steady line above the buttons that says what the box was last told to do (ordered a song, finished, never started); an empty text hides it. */
    void setInfo(String text) {
        info.setText(text);
        info.setVisibility(text.isEmpty() ? GONE : VISIBLE);
    }

    /** A steady line above the buttons that says what is wrong (not linked, no internet); an empty text hides it. */
    void setStatus(String text) {
        status.setText(text);
        status.setVisibility(text.isEmpty() ? GONE : VISIBLE);
    }

    /** A short sentence above the buttons (a song was added, or something failed). */
    void flash(String text) {
        message.setText(text);
        message.setVisibility(VISIBLE);
        ui.removeCallbacks(hideMessage);
        ui.postDelayed(hideMessage, MESSAGE_MS);
    }

    private final Runnable hideMessage = new Runnable() {
        @Override public void run() { message.setVisibility(GONE); }
    };

    // ---- the tables ----

    private void buildTables(QueueClient.Song now) {
        tablesColumn.removeAllViews();
        boxViews.clear();
        for (int start = 0; start < tableNames.size(); start += COLUMNS) {
            LinearLayout row = new LinearLayout(getContext());
            row.setOrientation(HORIZONTAL);
            for (int column = 0; column < COLUMNS; column++) {
                int index = start + column;
                row.addView(index < tableNames.size() ? tableBox(tableNames.get(index), now) : spacer());
            }
            tablesColumn.addView(row, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, dp(BOX_HEIGHT_DP)));
        }
    }

    private View spacer() {
        View empty = new View(getContext());
        empty.setLayoutParams(boxParams());
        return empty;
    }

    private LinearLayout.LayoutParams boxParams() {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(0, LayoutParams.MATCH_PARENT, 1f);
        params.setMargins(dp(5), dp(5), dp(5), dp(5));
        return params;
    }

    private View tableBox(final String table, QueueClient.Song now) {
        List<QueueClient.Song> songs = songsByTable.get(table);
        int count = songs == null ? 0 : songs.size();
        LinearLayout box = new LinearLayout(getContext());
        box.setOrientation(VERTICAL);
        box.setPadding(dp(12), dp(8), dp(12), dp(8));
        box.setBackground(rounded(Color.parseColor(table.equals(selected) ? CARD_ON : CARD), RADIUS_DP));
        box.setLayoutParams(boxParams());
        boxViews.put(table, box);

        TextView head = text(getContext(), Words.t("Table ", "桌 ", "Meja ") + table + "  ·  " + count, 19, true, GOLD);
        head.setSingleLine(true);
        box.addView(head);

        ScrollView inner = new ScrollView(getContext());
        LinearLayout list = new LinearLayout(getContext());
        list.setOrientation(VERTICAL);
        for (int i = 0; songs != null && i < songs.size(); i++) {
            QueueClient.Song song = songs.get(i);
            boolean singing = now != null && song.id == now.id;
            TextView line = text(getContext(), (singing ? "🎤 " : song.position + ". ") + (CloudMarks.has(song.karaokeCode) ? "☁ " : "") + song.title, 15, singing, singing ? GOLD : "#ffffff");
            line.setSingleLine(true);
            line.setEllipsize(TextUtils.TruncateAt.END);
            list.addView(line);
        }
        inner.addView(list);
        // A box that has more songs than fit scrolls itself; one that does not lets the whole table area scroll. A scrolling area never reports a click,
        // so a tap on the songs of a box is recognised here and chooses the table like a tap on the rest of the box.
        final GestureDetector taps = new GestureDetector(getContext(), new GestureDetector.SimpleOnGestureListener() {
            @Override public boolean onSingleTapUp(MotionEvent event) {
                chooseTable(table);
                return true;
            }
        });
        inner.setOnTouchListener(new OnTouchListener() {
            @Override public boolean onTouch(View view, MotionEvent event) {
                view.getParent().requestDisallowInterceptTouchEvent(view.canScrollVertically(1) || view.canScrollVertically(-1));
                taps.onTouchEvent(event);
                return false;
            }
        });
        box.setOnClickListener(new OnClickListener() {
            @Override public void onClick(View view) { chooseTable(table); }
        });
        box.addView(inner, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, 0, 1f));
        return box;
    }

    /** Only the two boxes whose look changes are touched, so the tap answers at once. */
    private void chooseTable(String table) {
        String previous = selected;
        selected = table;
        highlight(previous);
        highlight(table);
        showChoose();
    }

    private void highlight(String table) {
        LinearLayout box = table == null ? null : boxViews.get(table);
        if (box != null) box.setBackground(rounded(Color.parseColor(table.equals(selected) ? CARD_ON : CARD), RADIUS_DP));
    }

    private static String tableKey(QueueClient.Song song) {
        return song.table.isEmpty() ? song.name : song.table;
    }

    private static String signatureOf(Map<String, List<QueueClient.Song>> byTable) {
        StringBuilder text = new StringBuilder();
        for (Map.Entry<String, List<QueueClient.Song>> entry : byTable.entrySet()) {
            text.append(entry.getKey()).append(':');
            for (QueueClient.Song song : entry.getValue()) text.append(song.id).append('/').append(song.position).append(',');
            text.append(';');
        }
        return text.toString();
    }

    // ---- the middle: home, the four ways, the song list ----

    /** The front page: every table fills the screen, nothing else. Choosing a table hides them and opens the song pages; their Tables button comes back here. */
    private void showHome() {
        String previous = selected;
        selected = null;
        highlight(previous);
        loadId++;
        middle.removeAllViews();
        showTables(true);
    }

    private void showTables(boolean shown) {
        tablesScroll.setVisibility(shown ? VISIBLE : GONE);
        middle.setVisibility(shown ? GONE : VISIBLE);
    }

    private TextView tablesButton() {
        TextView home = text(getContext(), "🏠 " + Words.t("Tables", "桌子", "Meja"), 18, false, "#ffffff");
        home.setPadding(dp(18), dp(8), dp(18), dp(8));
        home.setBackground(rounded(Color.parseColor(CARD), RADIUS_DP + 8));
        home.setOnClickListener(new OnClickListener() {
            @Override public void onClick(View view) { showHome(); }
        });
        return home;
    }

    private void showChoose() {
        loadId++;
        middle.removeAllViews();
        showTables(false);
        LinearLayout top = new LinearLayout(getContext());
        top.setOrientation(HORIZONTAL);
        top.setGravity(Gravity.CENTER_VERTICAL);
        top.addView(tablesButton());
        TextView which = text(getContext(), Words.t("Table ", "桌 ", "Meja ") + selected, 22, true, GOLD);
        which.setPadding(dp(14), 0, dp(14), 0);
        top.addView(which);
        middle.addView(top, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT));
        LinearLayout ways = new LinearLayout(getContext());
        ways.setOrientation(HORIZONTAL);
        ways.addView(wayButton("🎤", Words.t("Singers", "歌手", "Penyanyi"), Way.SINGERS));
        ways.addView(wayButton("🔤", Words.t("Song title", "歌名", "Judul lagu"), Way.TITLE));
        ways.addView(wayButton("🔥", Words.t("Top songs", "热门歌曲", "Lagu terpopuler"), Way.TOP));
        ways.addView(wayButton("✨", Words.t("New songs", "新歌", "Lagu baru"), Way.FRESH));        middle.addView(ways, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, 0, 1f));
    }

    private View wayButton(String emoji, String label, final Way way) {
        TextView button = text(getContext(), emoji + "\n" + label, 30, true, "#ffffff");
        button.setGravity(Gravity.CENTER);
        button.setBackground(rounded(Color.parseColor(CARD), RADIUS_DP + 8));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(0, LayoutParams.MATCH_PARENT, 1f);
        params.setMargins(dp(7), dp(6), dp(7), dp(8));
        button.setLayoutParams(params);
        button.setOnClickListener(new OnClickListener() {
            @Override public void onClick(View view) { showWay(way); }
        });
        return button;
    }

    private LinearLayout listArea;
    private boolean serverSearchPage = false; // the song-title page asks the box for what is typed; the other pages only filter the list that is shown
    private boolean singerSearchPage = false; // on the singers page what is typed is asked of the box (it has ~28,000 singers, far more than a page shows)
    private boolean showingSingers = false;
    private List<SongPick> loadedPicks = new ArrayList<SongPick>();
    private List<String> loadedSingers = new ArrayList<String>();
    private String language = LANGUAGE_ALL;
    private int length = LENGTH_ANY; // the number of characters (words) the title must have: 1 to 5, or 6 and more
    private View keyboardView;
    private final Map<String, TextView> chips = new HashMap<String, TextView>();
    private final Map<Integer, TextView> lengthChips = new HashMap<Integer, TextView>();

    /**
     * A list page: back button and title, a bar for the typed words (a search on the song-title page, a filter everywhere else), the language chips, and the
     * list on the left with a keyboard on the right (shown at once on the song-title page, after a tap on the bar on the others).
     */
    private void showListPage(String title, final Runnable back, boolean serverSearch) {
        showTables(false);
        serverSearchPage = serverSearch;
        singerSearchPage = false;
        typed.setLength(0);
        language = LANGUAGE_ALL;
        length = LENGTH_ANY;
        loadedPicks = new ArrayList<SongPick>();
        loadedSingers = new ArrayList<String>();
        showingSingers = false;
        middle.removeAllViews();

        LinearLayout head = new LinearLayout(getContext());
        head.setOrientation(HORIZONTAL);
        head.setGravity(Gravity.CENTER_VERTICAL);
        TextView backButton = text(getContext(), "← " + Words.t("Back", "返回", "Kembali"), 18, false, "#ffffff");
        backButton.setPadding(dp(18), dp(8), dp(18), dp(8));
        backButton.setBackground(rounded(Color.parseColor(CARD), RADIUS_DP + 8));
        backButton.setOnClickListener(new OnClickListener() {
            @Override public void onClick(View view) { back.run(); }
        });
        head.addView(backButton);
        TextView homeButton = tablesButton();
        LinearLayout.LayoutParams homeParams = new LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT);
        homeParams.setMargins(dp(8), 0, 0, 0);
        head.addView(homeButton, homeParams);
        TextView heading = text(getContext(), Words.t("Table ", "桌 ", "Meja ") + selected + " · " + title, 22, true, GOLD);
        heading.setPadding(dp(14), 0, dp(14), 0);
        head.addView(heading, new LinearLayout.LayoutParams(0, LayoutParams.WRAP_CONTENT, 1f));
        searchBox = text(getContext(), "", 22, true, "#ffffff");
        searchBox.setSingleLine(true);
        searchBox.setPadding(dp(16), dp(8), dp(16), dp(8));
        searchBox.setBackground(rounded(Color.parseColor(CARD), RADIUS_DP));
        showTypedText();
        head.addView(searchBox, new LinearLayout.LayoutParams(dp(SEARCH_WIDTH_DP), LayoutParams.WRAP_CONTENT));
        middle.addView(head, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT));
        middle.addView(languageRow(), new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT));

        ScrollView scroll = new ScrollView(getContext());
        listArea = new LinearLayout(getContext());
        listArea.setOrientation(VERTICAL);
        scroll.addView(listArea);
        keyboardView = new OnScreenKeyboard(getContext(), new OnScreenKeyboard.Listener() {
            @Override public void onKey(String letter) { typed.append(letter); typedChanged(); }

            @Override public void onBackspace() { if (typed.length() > 0) typed.setLength(typed.length() - 1); typedChanged(); }

            @Override public void onClear() { typed.setLength(0); typedChanged(); }
        });
        setKeyboardShown(serverSearch);
        searchBox.setOnClickListener(new OnClickListener() {
            @Override public void onClick(View view) { setKeyboardShown(keyboardView.getVisibility() != VISIBLE); }
        });
        LinearLayout halves = new LinearLayout(getContext());
        halves.setOrientation(HORIZONTAL);
        halves.addView(scroll, new LinearLayout.LayoutParams(0, LayoutParams.MATCH_PARENT, 1f));
        halves.addView(keyboardView, new LinearLayout.LayoutParams(0, LayoutParams.MATCH_PARENT, 1f));
        middle.addView(halves, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, 0, 1f));
    }

    private void setKeyboardShown(boolean shown) {
        keyboardView.setVisibility(shown ? VISIBLE : GONE);
    }

    // ---- the language chips and the filters ----

    private LinearLayout languageRow() {
        chips.clear();
        lengthChips.clear();
        LinearLayout row = new LinearLayout(getContext());
        row.setOrientation(HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(0, dp(4), 0, dp(4));
        row.addView(text(getContext(), "🌐  ", 18, false, "#ffffff"));
        row.addView(chip(Words.t("All", "全部", "Semua"), LANGUAGE_ALL));
        row.addView(chip("中文", LANGUAGE_CHINESE));
        row.addView(chip("English", LANGUAGE_ENGLISH));
        row.addView(chip("日本語", LANGUAGE_JAPANESE));
        row.addView(chip("한국어", LANGUAGE_KOREAN));
        row.addView(text(getContext(), "   " + Words.t("Words", "字数", "Kata") + "  ", 18, false, "#ffffff"));
        for (int count = 1; count <= MAX_LENGTH; count++) row.addView(lengthChip(count));
        highlightChips();
        return row;
    }

    private TextView chip(String label, final String code) {
        TextView chip = text(getContext(), label, 18, true, "#ffffff");
        chip.setPadding(dp(18), dp(6), dp(18), dp(6));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT);
        params.setMargins(0, 0, dp(8), 0);
        chip.setLayoutParams(params);
        chip.setOnClickListener(new OnClickListener() {
            @Override public void onClick(View view) {
                language = code;
                highlightChips();
                applyFilters();
            }
        });
        chips.put(code, chip);
        return chip;
    }

    /** 1 to 5 and "6+": a tap picks that number of words in the title, a second tap on it clears the filter. */
    private TextView lengthChip(final int count) {
        TextView chip = text(getContext(), count == MAX_LENGTH ? count + "+" : String.valueOf(count), 18, true, "#ffffff");
        chip.setGravity(Gravity.CENTER);
        chip.setPadding(dp(14), dp(6), dp(14), dp(6));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(LayoutParams.WRAP_CONTENT, LayoutParams.WRAP_CONTENT);
        params.setMargins(0, 0, dp(6), 0);
        chip.setLayoutParams(params);
        chip.setOnClickListener(new OnClickListener() {
            @Override public void onClick(View view) {
                length = length == count ? LENGTH_ANY : count;
                highlightChips();
                applyFilters();
            }
        });
        lengthChips.put(count, chip);
        return chip;
    }

    /**
     * How many words a title has, the way a karaoke system counts for "by number of words": the characters of a Chinese, Japanese or Korean title,
     * the words of any other, a bracket like (T.I) left out.
     */
    static int lengthOf(String title) {
        String bare = title.replaceAll("[(（\\[【][^)）\\]】]*[)）\\]】]", " ").trim();
        if (bare.isEmpty()) return 0;
        if (!languageOf(bare).equals(LANGUAGE_ENGLISH) && !languageOf(bare).isEmpty()) {
            int characters = 0;
            for (int i = 0; i < bare.length(); ) {
                int point = bare.codePointAt(i);
                i += Character.charCount(point);
                if (Character.isLetterOrDigit(point)) characters++;
            }
            return characters;
        }
        return bare.split("\\s+").length;
    }

    private boolean matchesLength(String title) {
        if (length == LENGTH_ANY) return true;
        int found = lengthOf(title);
        return length >= MAX_LENGTH ? found >= MAX_LENGTH : found == length;
    }

    private void highlightChips() {
        for (Map.Entry<Integer, TextView> entry : lengthChips.entrySet()) {
            boolean on = entry.getKey() == length;
            entry.getValue().setBackground(rounded(Color.parseColor(on ? GOLD : CARD), RADIUS_DP + 8));
            entry.getValue().setTextColor(Color.parseColor(on ? "#1b1130" : "#ffffff"));
        }
        for (Map.Entry<String, TextView> entry : chips.entrySet()) {
            boolean on = entry.getKey().equals(language);
            entry.getValue().setBackground(rounded(Color.parseColor(on ? GOLD : CARD), RADIUS_DP + 8));
            entry.getValue().setTextColor(Color.parseColor(on ? "#1b1130" : "#ffffff"));
        }
    }

    /** The language of a title by its letters: Japanese (kana), Korean (hangul), Chinese (Han characters), English / Latin letters; "" when it has none of them. */
    static String languageOf(String text) {
        boolean han = false, kana = false, hangul = false, latin = false;
        for (int i = 0; i < text.length(); ) {
            int point = text.codePointAt(i);
            i += Character.charCount(point);
            if ((point >= 0x4E00 && point <= 0x9FFF) || (point >= 0x3400 && point <= 0x4DBF)) han = true;
            else if (point >= 0x3040 && point <= 0x30FF) kana = true;
            else if ((point >= 0xAC00 && point <= 0xD7AF) || (point >= 0x1100 && point <= 0x11FF)) hangul = true;
            else if ((point >= 'a' && point <= 'z') || (point >= 'A' && point <= 'Z')) latin = true;
        }
        if (kana) return LANGUAGE_JAPANESE;
        if (hangul) return LANGUAGE_KOREAN;
        if (han) return LANGUAGE_CHINESE;
        return latin ? LANGUAGE_ENGLISH : "";
    }

    private boolean matchesLanguage(String title, String artist) {
        if (LANGUAGE_ALL.equals(language)) return true;
        String found = languageOf(title);
        if (found.isEmpty()) found = languageOf(artist);
        return language.equals(found);
    }

    /** Shows again what was loaded, through the language chip and (on the pages that filter) the typed words. */
    private void applyFilters() {
        if (showingSingers) renderSingers();
        else renderPicks();
    }

    private String wantedWords() {
        return serverSearchPage ? "" : SongFiles.squash(typed.toString());
    }

    private void showWay(final Way way) {
        final Runnable backToWays = new Runnable() {
            @Override public void run() { showChoose(); }
        };
        if (way == Way.TITLE) {
            showListPage(Words.t("Song title", "歌名", "Judul lagu"), backToWays, true);
        } else if (way == Way.SINGERS) {
            showListPage(Words.t("Singers", "歌手", "Penyanyi"), backToWays, true);
            singerSearchPage = true;
            showTypedText();
            loadSingers("");
        } else {
            showListPage(way == Way.TOP ? Words.t("Top songs", "热门歌曲", "Lagu terpopuler") : Words.t("New songs", "新歌", "Lagu baru"), backToWays, false);
            loadPicks(way);
        }
    }

    private final Runnable searchNow = new Runnable() {
        @Override public void run() {
            if (singerSearchPage) loadSingers(typed.toString().trim());
            else loadSearch(typed.toString().trim());
        }
    };

    /** Typing: the song-title and singer pages ask the box a moment after the last key; the other pages filter the list at once. */
    private void typedChanged() {
        showTypedText();
        if (serverSearchPage) {
            ui.removeCallbacks(searchNow);
            ui.postDelayed(searchNow, SEARCH_DELAY_MS);
        } else {
            applyFilters();
        }
    }

    private void showTypedText() {
        boolean isEmpty = typed.length() == 0;
        String placeholder = singerSearchPage ? Words.t("Type the singer's name or letters", "输入歌手名或拼音字母", "Ketik nama penyanyi atau huruf")
                : serverSearchPage ? Words.t("Type the song name", "输入歌名", "Ketik judul lagu") :Words.t("Tap to filter by a word", "点击输入关键词筛选", "Ketuk untuk memfilter kata");
        searchBox.setText("🔍  " + (isEmpty ? placeholder : typed.toString() + "▏"));
        searchBox.setTextColor(Color.parseColor(isEmpty ? "#99ffffff" : "#ffffff"));
    }

    private void loadSearch(final String text) {
        final int mine = ++loadId;
        runOffScreen(new Task() {
            @Override public void run() throws Exception {
                final List<SongPick> found = catalog.search(text);
                postIfCurrent(mine, new Runnable() { @Override public void run() { fillPicks(found); } });
            }
        }, mine);
    }

    private void loadPicks(final Way way) {
        final int mine = ++loadId;
        listArea.addView(text(getContext(), Words.t("Loading…", "加载中…", "Memuat…"), 20, false, SOFT));
        runOffScreen(new Task() {
            @Override public void run() throws Exception {
                final List<SongPick> found = way == Way.TOP ? catalog.top() : catalog.fresh();
                postIfCurrent(mine, new Runnable() { @Override public void run() { fillPicks(found); } });
            }
        }, mine);
    }

    private void loadSingers(final String text) {
        final int mine = ++loadId;
        listArea.removeAllViews();
        listArea.addView(text(getContext(), Words.t("Loading…", "加载中…", "Memuat…"), 20, false, SOFT));
        runOffScreen(new Task() {
            @Override public void run() throws Exception {
                final List<String> names = catalog.singers(text);
                postIfCurrent(mine, new Runnable() { @Override public void run() { fillSingers(names); } });
            }
        }, mine);
    }

    /** One singer's songs; `back` says where Back goes (the singers list when opened from it, the way chooser when opened from a song's face). */
    private void loadSingerSongs(final String singer, Runnable back) {
        showListPage(singer, back, false);
        final int mine = ++loadId;
        listArea.addView(text(getContext(), Words.t("Loading…", "加载中…", "Memuat…"), 20, false, SOFT));
        runOffScreen(new Task() {
            @Override public void run() throws Exception {
                final List<SongPick> found = catalog.songsOf(singer);
                postIfCurrent(mine, new Runnable() { @Override public void run() { fillPicks(found); } });
            }
        }, mine);
    }

    private interface Task {
        void run() throws Exception;
    }

    private void runOffScreen(final Task task, final int mine) {
        new Thread(new Runnable() {
            @Override public void run() {
                try {
                    task.run();
                } catch (Exception failure) {
                    OverlayLog.add("touch: " + failure.getClass().getSimpleName() + " " + failure.getMessage());
                    postIfCurrent(mine, new Runnable() { @Override public void run() { empty(Words.t("Could not load the songs", "无法加载歌曲", "Tidak bisa memuat lagu")); } });
                }
            }
        }, "touch-load").start();
    }

    private void postIfCurrent(final int mine, final Runnable work) {
        ui.post(new Runnable() {
            @Override public void run() { if (mine == loadId) work.run(); }
        });
    }

    private void empty(String text) {
        listArea.removeAllViews();
        String reason = catalog.whyEmpty();
        listArea.addView(text(getContext(), text + (reason.isEmpty() ? "" : "\n" + reason) + "\n" + Words.t("Songs come from: ", "歌曲来源：", "Lagu berasal dari: ") + catalog.source(), 22, false, SOFT));
    }

    private void fillSingers(List<String> names) {
        loadedSingers = names;
        showingSingers = true;
        renderSingers();
    }

    private void renderSingers() {
        listArea.removeAllViews();
        if (loadedSingers.isEmpty()) {
            empty(Words.t("No singers came back.", "没有返回任何歌手。", "Tidak ada penyanyi yang dikembalikan."));
            return;
        }
        String wanted = wantedWords();
        int shown = 0;
        for (final String name : loadedSingers) {
            if (!wanted.isEmpty() && !SongFiles.squash(name).contains(wanted)) continue;
            if (!matchesLanguage(name, "") || !matchesLength(name)) continue;
            shown++;
            listArea.addView(row("🎤", name, null, name, "", Words.t("Open", "打开", "Buka"), new Runnable() {
                @Override public void run() { loadSingerSongs(name, backToSingers()); }
            }));
        }
        if (shown == 0) listArea.addView(text(getContext(), Words.t("No singer matches your filter", "没有符合筛选的歌手", "Tidak ada penyanyi yang cocok dengan filter"), 22, false, SOFT));
    }

    private Runnable backToSingers() {
        return new Runnable() {
            @Override public void run() { showWay(Way.SINGERS); }
        };
    }

    private void fillPicks(List<SongPick> picks) {
        loadedPicks = picks;
        showingSingers = false;
        renderPicks();
    }

    private void renderPicks() {
        listArea.removeAllViews();
        if (loadedPicks.isEmpty()) {
            empty(Words.t("No songs found", "没有找到歌曲", "Lagu tidak ditemukan"));
            return;
        }
        String wanted = wantedWords();
        int shown = 0;
        for (final SongPick pick : loadedPicks) {
            if (!wanted.isEmpty() && !SongFiles.squash(pick.title + " " + pick.artist).contains(wanted)) continue;
            if (!matchesLanguage(pick.title, pick.artist) || !matchesLength(pick.title)) continue;
            shown++;
            listArea.addView(row(pick.isYoutube() ? "▶" : "🎵", "", pick, (pick.isYoutube() ? "" : pick.cloud ? "☁ " : "✓ ") + pick.title, pick.artist, Words.t("Sing", "点唱", "Nyanyi"), new Runnable() {
                @Override public void run() { request(pick); }
            }));
        }
        if (shown == 0) listArea.addView(text(getContext(), Words.t("No song matches your filter", "没有符合筛选的歌曲", "Tidak ada lagu yang cocok dengan filter"), 22, false, SOFT));
    }

    private void request(final SongPick pick) {
        final String table = selected;
        if (table == null) return;
        new Thread(new Runnable() {
            @Override public void run() {
                String sentence;
                try {
                    sentence = actions.onRequest(table, pick);
                } catch (Exception failure) {
                    OverlayLog.add("touch: request failed: " + failure.getMessage());
                    sentence = Words.t("Could not add the song. Check the internet.", "无法点歌，请检查网络。", "Tidak bisa menambah lagu. Periksa internet.");
                }
                final String shown = sentence;
                ui.post(new Runnable() { @Override public void run() { flash(shown); } });
            }
        }, "touch-request").start();
    }

    /** A round picture of the singer (the icon stays until, and unless, a picture is found). */
    private View badge(String icon, String singer, SongPick pick) {
        FrameLayout holder = new FrameLayout(getContext());
        holder.setBackground(rounded(Color.parseColor("#44ffffff"), PHOTO_DP / 2));
        TextView fallback = text(getContext(), icon, 26, false, "#ffffff");
        fallback.setGravity(Gravity.CENTER);
        holder.addView(fallback, new FrameLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));
        ImageView picture = new ImageView(getContext());
        picture.setScaleType(ImageView.ScaleType.CENTER_CROP);
        picture.setOutlineProvider(new ViewOutlineProvider() {
            @Override public void getOutline(View view, Outline outline) { outline.setOval(0, 0, view.getWidth(), view.getHeight()); }
        });
        picture.setClipToOutline(true);
        holder.addView(picture, new FrameLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));
        if (pick != null) photos.loadForSong(pick, picture);
        else if (singer.isEmpty()) picture.setVisibility(GONE);
        else photos.load(singer, picture);
        holder.setLayoutParams(new LinearLayout.LayoutParams(dp(PHOTO_DP), dp(PHOTO_DP)));
        return holder;
    }

    /** "A, B" -> "A": the singer whose songs a tap on the face opens. */
    private static String firstSinger(String artist) {
        String[] names = artist.split("[,，、]");
        return names.length == 0 ? "" : names[0].trim();
    }

    private View row(String icon, String singer, SongPick pick, String title, String artist, String action, final Runnable onTap) {
        LinearLayout row = new LinearLayout(getContext());
        row.setOrientation(HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(dp(16), dp(8), dp(16), dp(8));
        row.setBackground(rounded(Color.parseColor(CARD), RADIUS_DP));
        LinearLayout.LayoutParams spacing = new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
        spacing.setMargins(0, dp(3), 0, dp(3));
        row.setLayoutParams(spacing);
        View face = badge(icon, singer, pick);
        final String faceOf = pick == null || pick.isYoutube() ? "" : firstSinger(pick.artist);
        if (!faceOf.isEmpty()) {
            face.setOnClickListener(new OnClickListener() {
                @Override public void onClick(View view) { loadSingerSongs(faceOf, new Runnable() { @Override public void run() { showChoose(); } }); }
            });
        }
        row.addView(face);
        LinearLayout words = new LinearLayout(getContext());
        words.setOrientation(VERTICAL);
        words.setPadding(dp(14), 0, dp(14), 0);
        TextView name = text(getContext(), title, 22, true, "#ffffff");
        name.setSingleLine(true);
        name.setEllipsize(TextUtils.TruncateAt.END);
        words.addView(name);
        if (!artist.isEmpty()) words.addView(text(getContext(), artist, 16, false, SOFT));
        row.addView(words, new LinearLayout.LayoutParams(0, LayoutParams.WRAP_CONTENT, 1f));
        TextView go = text(getContext(), action, 20, true, "#1b1130");
        go.setPadding(dp(22), dp(10), dp(22), dp(10));
        go.setBackground(rounded(Color.parseColor(GOLD), RADIUS_DP + 8));
        row.addView(go);
        row.setOnClickListener(new OnClickListener() {
            @Override public void onClick(View view) { onTap.run(); }
        });
        return row;
    }

    // ---- the control bar and small helpers ----

    private TextView barButton(LinearLayout bar, String emoji, String label, final Runnable onTap) {
        TextView button = text(getContext(), emoji + "\n" + label, 14, true, "#ffffff");
        button.setGravity(Gravity.CENTER);
        button.setBackground(rounded(Color.parseColor(CARD), RADIUS_DP));
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(0, LayoutParams.MATCH_PARENT, 1f);
        params.setMargins(dp(4), dp(6), dp(4), dp(8));
        button.setLayoutParams(params);
        if (onTap != null) button.setOnClickListener(new OnClickListener() {
            @Override public void onClick(View view) { onTap.run(); }
        });
        bar.addView(button);
        return button;
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
