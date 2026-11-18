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

        List<String> singers() throws Exception;

        List<SongPick> songsOf(String singer) throws Exception;

        List<SongPick> top() throws Exception;

        List<SongPick> fresh() throws Exception;
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
    private static final int TABLES_HEIGHT_DP = 300;
    private static final int TABLES_WITH_KEYBOARD_DP = 110; // the tables shrink on the song-title page, so the results, search bar and keyboard fit
    private static final int KEYBOARD_HEIGHT_DP = 200;
    private static final int SEARCH_WIDTH_DP = 380;
    private static final int PHOTO_DP = 56;
    private static final int BOX_HEIGHT_DP = 132;
    private static final int BAR_HEIGHT_DP = 72;
    private static final int RADIUS_DP = 16;
    private static final long SEARCH_DELAY_MS = 450;
    private static final long MESSAGE_MS = 4_000;
    private static final int MAX_TONE = 6;

    private final Handler ui = new Handler(Looper.getMainLooper());
    private final Catalog catalog;
    private final Actions actions;
    private final ScrollView tablesScroll;
    private final LinearLayout tablesColumn;
    private final LinearLayout middle;
    private final TextView message;
    private final TextView muteButton;
    private final TextView playButton;
    private final TextView analogButton;
    private final TextView toneValue;
    private String selected = null;
    private String signature = "";
    private List<String> tableNames = new ArrayList<String>();
    private Map<String, List<QueueClient.Song>> songsByTable = new LinkedHashMap<String, List<QueueClient.Song>>();
    private int loadId = 0;
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

        tablesColumn = new LinearLayout(context);
        tablesColumn.setOrientation(VERTICAL);
        tablesScroll = new ScrollView(context);
        tablesScroll.setVerticalScrollBarEnabled(true);
        tablesScroll.setScrollbarFadingEnabled(false);
        tablesScroll.addView(tablesColumn);
        addView(tablesScroll, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, dp(TABLES_HEIGHT_DP)));

        middle = new LinearLayout(context);
        middle.setOrientation(VERTICAL);
        addView(middle, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, 0, 1f));

        message = text(context, "", 20, true, GOLD);
        message.setGravity(Gravity.CENTER);
        message.setVisibility(GONE);
        addView(message);

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
    }

    /** The tables (as the admin set them, in order) with the songs of each in the queue. Rebuilds only when something changed, keeping the scroll place. */
    void update(List<String> adminTables, QueueClient.Board board) {
        Map<String, List<QueueClient.Song>> byTable = new LinkedHashMap<String, List<QueueClient.Song>>();
        List<String> names = new ArrayList<String>(adminTables);
        List<QueueClient.Song> all = new ArrayList<QueueClient.Song>();
        if (board.now != null) all.add(board.now);
        all.addAll(board.queue);
        for (QueueClient.Song song : all) {
            String key = tableKey(song);
            if (!names.contains(key)) names.add(key);
            if (!byTable.containsKey(key)) byTable.put(key, new ArrayList<QueueClient.Song>());
            byTable.get(key).add(song);
        }
        String fresh = names + "|" + selected + "|" + signatureOf(byTable);
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

        TextView head = text(getContext(), Words.t("Table ", "桌 ", "Meja ") + table + "  ·  " + count, 19, true, GOLD);
        head.setSingleLine(true);
        box.addView(head);

        ScrollView inner = new ScrollView(getContext());
        LinearLayout list = new LinearLayout(getContext());
        list.setOrientation(VERTICAL);
        for (int i = 0; songs != null && i < songs.size(); i++) {
            QueueClient.Song song = songs.get(i);
            boolean singing = now != null && song.id == now.id;
            TextView line = text(getContext(), (singing ? "🎤 " : song.position + ". ") + song.title, 15, singing, singing ? GOLD : "#ffffff");
            line.setSingleLine(true);
            line.setEllipsize(TextUtils.TruncateAt.END);
            list.addView(line);
        }
        inner.addView(list);
        // A box that has more songs than fit scrolls itself; one that does not lets the whole table area scroll.
        inner.setOnTouchListener(new OnTouchListener() {
            @Override public boolean onTouch(View view, MotionEvent event) {
                view.getParent().requestDisallowInterceptTouchEvent(view.canScrollVertically(1) || view.canScrollVertically(-1));
                return false;
            }
        });
        OnClickListener choose = new OnClickListener() {
            @Override public void onClick(View view) { chooseTable(table); }
        };
        inner.setOnClickListener(choose);
        box.setOnClickListener(choose);
        box.addView(inner, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, 0, 1f));
        return box;
    }

    private void chooseTable(String table) {
        selected = table;
        signature = "";
        showChoose();
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

    private void showHome() {
        middle.removeAllViews();
        setTablesHeight(TABLES_HEIGHT_DP);
        TextView hint = text(getContext(), "👆  " + Words.t("Tap a table to choose songs for it", "点一下桌子，为它点歌", "Ketuk meja untuk memilih lagu"), 30, true, GOLD);
        hint.setGravity(Gravity.CENTER);
        middle.addView(hint, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));
    }

    private void showChoose() {
        loadId++;
        middle.removeAllViews();
        setTablesHeight(TABLES_HEIGHT_DP);
        LinearLayout ways = new LinearLayout(getContext());
        ways.setOrientation(HORIZONTAL);
        ways.addView(wayButton("🎤", Words.t("Singers", "歌手", "Penyanyi"), Way.SINGERS));
        ways.addView(wayButton("🔤", Words.t("Song title", "歌名", "Judul lagu"), Way.TITLE));
        ways.addView(wayButton("🔥", Words.t("Top songs", "热门歌曲", "Lagu terpopuler"), Way.TOP));
        ways.addView(wayButton("✨", Words.t("New songs", "新歌", "Lagu baru"), Way.FRESH));
        middle.addView(ways, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));
        rebuildTablesNow();
    }

    private void rebuildTablesNow() {
        signature = "";
        final int keep = tablesScroll.getScrollY();
        buildTables(null);
        tablesScroll.post(new Runnable() {
            @Override public void run() { tablesScroll.scrollTo(0, keep); }
        });
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

    /** The page with a back button, a title and (for a title search) a search box; `rows` is filled by the caller. */
    private void showListPage(String title, final Runnable back, View search, View keyboard) {
        middle.removeAllViews();
        setTablesHeight(keyboard == null ? TABLES_HEIGHT_DP : TABLES_WITH_KEYBOARD_DP);
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
        TextView heading = text(getContext(), Words.t("Table ", "桌 ", "Meja ") + selected + " · " + title, 22, true, GOLD);
        heading.setPadding(dp(14), 0, dp(14), 0);
        head.addView(heading, new LinearLayout.LayoutParams(0, LayoutParams.WRAP_CONTENT, 1f));
        if (search != null) head.addView(search, new LinearLayout.LayoutParams(dp(SEARCH_WIDTH_DP), LayoutParams.WRAP_CONTENT));
        middle.addView(head, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT));

        // The search bar is at the top of the page and the keyboard opens right under it, above the results (tap the search bar to hide or show the keyboard).
        if (keyboard != null) {
            final View keys = keyboard;
            search.setOnClickListener(new OnClickListener() {
                @Override public void onClick(View view) { keys.setVisibility(keys.getVisibility() == VISIBLE ? GONE : VISIBLE); }
            });
            middle.addView(keyboard, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, dp(KEYBOARD_HEIGHT_DP)));
        }
        ScrollView scroll = new ScrollView(getContext());
        listArea = new LinearLayout(getContext());
        listArea.setOrientation(VERTICAL);
        scroll.addView(listArea);
        middle.addView(scroll, new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, 0, 1f));
    }

    private void setTablesHeight(int heightDp) {
        ViewGroup.LayoutParams params = tablesScroll.getLayoutParams();
        params.height = dp(heightDp);
        tablesScroll.setLayoutParams(params);
    }

    private void showWay(final Way way) {
        final Runnable backToWays = new Runnable() {
            @Override public void run() { showChoose(); }
        };
        if (way == Way.TITLE) {
            showTitleSearch(backToWays);
        } else if (way == Way.SINGERS) {
            showListPage(Words.t("Singers", "歌手", "Penyanyi"), backToWays, null, null);
            loadSingers();
        } else {
            showListPage(way == Way.TOP ? Words.t("Top songs", "热门歌曲", "Lagu terpopuler") : Words.t("New songs", "新歌", "Lagu baru"), backToWays, null, null);
            loadPicks(way);
        }
    }

    /** The song-title page: the typed name in a search bar, the results beside it and the keyboard drawn by the app at the bottom right. */
    private void showTitleSearch(Runnable back) {
        typed.setLength(0);
        searchBox = text(getContext(), "", 22, true, "#ffffff");
        searchBox.setSingleLine(true);
        searchBox.setPadding(dp(16), dp(8), dp(16), dp(8));
        searchBox.setBackground(rounded(Color.parseColor(CARD), RADIUS_DP));
        showTypedText();
        OnScreenKeyboard keyboard = new OnScreenKeyboard(getContext(), new OnScreenKeyboard.Listener() {
            @Override public void onKey(String letter) { typed.append(letter); changedTyping(); }

            @Override public void onBackspace() { if (typed.length() > 0) typed.setLength(typed.length() - 1); changedTyping(); }

            @Override public void onClear() { typed.setLength(0); changedTyping(); }
        });
        showListPage(Words.t("Song title", "歌名", "Judul lagu"), back, searchBox, keyboard);
    }

    private final Runnable searchNow = new Runnable() {
        @Override public void run() { loadSearch(typed.toString().trim()); }
    };

    private void changedTyping() {
        showTypedText();
        ui.removeCallbacks(searchNow);
        ui.postDelayed(searchNow, SEARCH_DELAY_MS);
    }

    private void showTypedText() {
        boolean isEmpty = typed.length() == 0;
        searchBox.setText("🔍  " + (isEmpty ? Words.t("Type the song name", "输入歌名", "Ketik judul lagu") : typed.toString() + "▏"));
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

    private void loadSingers() {
        final int mine = ++loadId;
        listArea.addView(text(getContext(), Words.t("Loading…", "加载中…", "Memuat…"), 20, false, SOFT));
        runOffScreen(new Task() {
            @Override public void run() throws Exception {
                final List<String> names = catalog.singers();
                postIfCurrent(mine, new Runnable() { @Override public void run() { fillSingers(names); } });
            }
        }, mine);
    }

    private void loadSingerSongs(final String singer) {
        showListPage(singer, new Runnable() {
            @Override public void run() { showWay(Way.SINGERS); }
        }, null, null);
        final int mine = ++loadId;
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
        listArea.addView(text(getContext(), text, 22, false, SOFT));
    }

    private void fillSingers(List<String> names) {
        listArea.removeAllViews();
        if (names.isEmpty()) {
            empty(Words.t("No singers yet: name the videos \"Singer - Title\"", "还没有歌手：请把视频命名为“歌手 - 歌名”", "Belum ada penyanyi: beri nama video \"Penyanyi - Judul\""));
            return;
        }
        for (final String name : names) {
            View row = row("🎤", name, null, name, "", Words.t("Open", "打开", "Buka"), new Runnable() {
                @Override public void run() { loadSingerSongs(name); }
            });
            listArea.addView(row);
        }
    }

    private void fillPicks(List<SongPick> picks) {
        listArea.removeAllViews();
        if (picks.isEmpty()) {
            empty(Words.t("No songs found", "没有找到歌曲", "Lagu tidak ditemukan"));
            return;
        }
        for (final SongPick pick : picks) {
            listArea.addView(row(pick.isYoutube() ? "▶" : "🎵", "", pick, pick.title, pick.artist, Words.t("Sing", "点唱", "Nyanyi"), new Runnable() {
                @Override public void run() { request(pick); }
            }));
        }
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

    private View row(String icon, String singer, SongPick pick, String title, String artist, String action, final Runnable onTap) {
        LinearLayout row = new LinearLayout(getContext());
        row.setOrientation(HORIZONTAL);
        row.setGravity(Gravity.CENTER_VERTICAL);
        row.setPadding(dp(16), dp(8), dp(16), dp(8));
        row.setBackground(rounded(Color.parseColor(CARD), RADIUS_DP));
        LinearLayout.LayoutParams spacing = new LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT);
        spacing.setMargins(0, dp(3), 0, dp(3));
        row.setLayoutParams(spacing);
        row.addView(badge(icon, singer, pick));
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
