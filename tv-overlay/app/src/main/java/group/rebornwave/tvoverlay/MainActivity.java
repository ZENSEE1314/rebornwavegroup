package group.rebornwave.tvoverlay;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import java.util.Locale;

/**
 * Set-up screen of the app on the karaoke box. First the song-system connector (link the box to the app with a code, then it runs by itself
 * whenever the box is on). Then the gift overlay: allow drawing over other apps, link to a TV screen of the app with a code
 * (the same way a TV is linked in a streaming app), and start / stop the overlay. After that the overlay starts by itself with the box.
 */
public class MainActivity extends Activity {
    private static final int TEXT_SP = 20;
    private static final int CODE_SP = 64;
    private static final long POLL_MS = 2000;
    private static final long CONNECTOR_REFRESH_MS = 3000;
    private static final long TEST_BANNER_MS = 6000;
    private static final int OVERLAY_LINES_SHOWN = 12;
    private static final int CONNECTOR_LINES_SHOWN = 6;

    private final Handler ui = new Handler(Looper.getMainLooper());
    private volatile boolean pairing = false;
    static final String EXTRA_SETTINGS = "settings";

    private volatile boolean connectorPairing = false;
    private TextView connectorStatus;
    private TextView connectorCode;
    private EditText tokenField;
    private TextView status;
    private TextView codeView;
    private EditText serverField;

    // Texts: English, 中文, Bahasa Indonesia.
    private static String t(String en, String zh, String id) {
        String language = Locale.getDefault().getLanguage();
        if ("zh".equals(language)) return zh;
        if ("in".equals(language) || "id".equals(language)) return id;
        return en;
    }

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        // The private app is the whole karaoke app: its icon opens the song system straight away (the set-up page is behind the gear button).
        if (Enroll.isAvailable() && !getIntent().getBooleanExtra(EXTRA_SETTINGS, false)) {
            startActivity(new android.content.Intent(this, PlayerActivity.class));
            finish();
            return;
        }
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(48, 48, 48, 48);
        root.setBackgroundColor(Color.parseColor("#12091f"));

        root.addView(label(t("Song system connector (no PC needed)", "点歌系统连接器（无需电脑）", "Konektor sistem lagu (tanpa PC)"), 28, true));
        connectorStatus = label("", 16, false);
        root.addView(connectorStatus);
        root.addView(button(t("Link this box to the app (shows a code)", "将本机链接到应用（显示代码）", "Hubungkan perangkat ini ke aplikasi (menampilkan kode)"), new View.OnClickListener() {
            @Override public void onClick(View v) { startConnectorPairing(); }
        }));
        connectorCode = label("", CODE_SP, true);
        connectorCode.setGravity(Gravity.CENTER);
        connectorCode.setTextColor(Color.parseColor("#fcd34d"));
        root.addView(connectorCode);
        root.addView(label(t("Then in the app: Admin > Requests > Karaoke system > type this code > Link the box. After that it starts by itself whenever the box is on.",
                "然后在应用中：管理 > 点歌 > 点歌系统 > 输入此代码 > 点“链接机器”。之后机器开机就会自动运行。",
                "Lalu di aplikasi: Admin > Permintaan > Sistem karaoke > ketik kode ini > Hubungkan mesin. Setelah itu berjalan sendiri setiap mesin menyala."), 16, false));
        root.addView(button(t("Start the connector now", "立即启动连接器", "Mulai konektor sekarang"), new View.OnClickListener() {
            @Override public void onClick(View v) { startConnector(); }
        }));
        root.addView(button(t("Stop the connector", "停止连接器", "Hentikan konektor"), new View.OnClickListener() {
            @Override public void onClick(View v) { BridgeService.stop(MainActivity.this); refreshConnector(); }
        }));
        root.addView(button(t("Open the built-in karaoke player", "打开内置卡拉OK播放器", "Buka pemutar karaoke bawaan"), new View.OnClickListener() {
            @Override public void onClick(View v) { startActivity(new android.content.Intent(MainActivity.this, PlayerActivity.class)); }
        }));
        root.addView(button(t("Go back to the box's own song program", "改回使用点歌机自带程序", "Kembali ke program lagu bawaan mesin"), new View.OnClickListener() {
            @Override public void onClick(View v) { BridgeSettings.savePlayerMode(MainActivity.this, false); startConnector(); }
        }));
        final Button playback = button("", null);
        // Press and hold, so a touch on the big button at the top of this page cannot switch who plays the songs by accident.
        playback.setOnLongClickListener(new View.OnLongClickListener() {
            @Override public boolean onLongClick(View v) {
                BridgeSettings.saveBoxPlayback(MainActivity.this, !BridgeSettings.isBoxPlayback(MainActivity.this));
                showPlaybackSetting(playback);
                return true;
            }
        });
        showPlaybackSetting(playback);
        root.addView(playback);
        final Button cloud = button("", null);
        cloud.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) { BridgeSettings.saveShowCloud(MainActivity.this, !BridgeSettings.isShowCloud(MainActivity.this)); showCloudSetting(cloud); }
        });
        showCloudSetting(cloud);
        root.addView(cloud);
        final TextView boxTestResult = label("", 14, false);
        root.addView(button(t("Test the box's own song system", "测试点歌机自带的点歌系统", "Tes sistem lagu bawaan mesin"), new View.OnClickListener() {
            @Override public void onClick(View v) {
                boxTestResult.setText(t("Testing…", "测试中…", "Menguji…"));
                new Thread(new Runnable() {
                    @Override public void run() {
                        final String report = BoxServlets.diagnose(MainActivity.this)
                                + "\n" + t("Connector: ", "连接器：", "Konektor: ") + (BridgeService.running ? "running" : "NOT running") + " — " + BridgeService.status
                                + "\n" + BridgeService.recentLines(8);
                        ui.post(new Runnable() { @Override public void run() { boxTestResult.setText(report); } });
                    }
                }, "box-test").start();
            }
        }));
        root.addView(button(t("Order a test song on the box (plays 3 seconds)", "在点歌机上点一首测试歌（播放3秒）", "Pesan lagu uji di mesin (diputar 3 detik)"), new View.OnClickListener() {
            @Override public void onClick(View v) {
                boxTestResult.setText(t("Ordering a test song…", "正在点测试歌…", "Memesan lagu uji…"));
                new Thread(new Runnable() {
                    @Override public void run() {
                        final String report = BoxServlets.trial(MainActivity.this) + "\n" + OverlayLog.recent(6);
                        ui.post(new Runnable() { @Override public void run() { boxTestResult.setText(report); } });
                    }
                }, "box-trial").start();
            }
        }));
        root.addView(boxTestResult);
        final Button voiceSide = button("", null);
        voiceSide.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) { BridgeSettings.saveVoiceFirst(MainActivity.this, !BridgeSettings.isVoiceFirst(MainActivity.this)); showVoiceSettings(voiceSide, null); }
        });
        final Button voiceChannels = button("", null);
        voiceChannels.setOnClickListener(new View.OnClickListener() {
            @Override public void onClick(View v) { BridgeSettings.saveChannelVoice(MainActivity.this, !BridgeSettings.isChannelVoice(MainActivity.this)); showVoiceSettings(voiceSide, voiceChannels); }
        });
        showVoiceSettings(voiceSide, voiceChannels);
        root.addView(voiceSide);
        root.addView(voiceChannels);
        root.addView(label(t("Or paste the token by hand (Admin > Requests > Karaoke system > Make token):", "或手动粘贴令牌（管理 > 点歌 > 点歌系统 > 生成令牌）：", "Atau tempel token manual (Admin > Permintaan > Sistem karaoke > Buat token):"), 16, false));
        tokenField = new EditText(this);
        tokenField.setSingleLine(true);
        tokenField.setTextColor(Color.WHITE);
        root.addView(tokenField);
        root.addView(button(t("Save the token and start", "保存令牌并启动", "Simpan token dan mulai"), new View.OnClickListener() {
            @Override public void onClick(View v) { saveTokenAndStart(); }
        }));

        root.addView(label(t("Gift overlay for the karaoke box", "点歌机礼物特效叠加", "Overlay hadiah untuk mesin karaoke"), 28, true));
        status = label("", TEXT_SP, false);
        root.addView(status);

        root.addView(button(t("1. Allow drawing over other apps", "1. 允许显示在其他应用上方", "1. Izinkan tampil di atas aplikasi lain"), new View.OnClickListener() {
            @Override public void onClick(View v) { askOverlayPermission(); }
        }));
        root.addView(button(t("1b. Or allow it in Accessibility (when step 1 says Feature not available)", "1b. 或在“无障碍”中允许（当第1步显示“功能不可用”时）", "1b. Atau izinkan di Aksesibilitas (jika langkah 1 bilang Fitur tidak tersedia)"), new View.OnClickListener() {
            @Override public void onClick(View v) { openAccessibilitySettings(); }
        }));
        root.addView(button(t("2. Link this box to a TV screen (shows a code)", "2. 将本机链接到电视屏幕（显示代码）", "2. Hubungkan perangkat ini ke layar TV (menampilkan kode)"), new View.OnClickListener() {
            @Override public void onClick(View v) { startPairing(); }
        }));
        codeView = label("", CODE_SP, true);
        codeView.setGravity(Gravity.CENTER);
        codeView.setTextColor(Color.parseColor("#fcd34d"));
        root.addView(codeView);
        root.addView(label(t("Then in the app: Admin > Lights & TV > TV > choose the screen (view: overlay) > type this code and press Link.",
                "然后在应用中：管理 > 灯光和电视 > 电视 > 选择屏幕（视图：叠加）> 输入此代码并点“链接”。",
                "Lalu di aplikasi: Admin > Lampu & TV > TV > pilih layar (tampilan: overlay) > ketik kode ini lalu tekan Hubungkan."), 16, false));
        root.addView(label(t("Show the gifts on:", "礼物显示在：", "Tampilkan hadiah di:"), 18, true));
        root.addView(button(t("The HDMI / TV screen (the guests' TV)", "HDMI / 电视屏幕（客人看的电视）", "Layar HDMI / TV (TV untuk tamu)"), new View.OnClickListener() {
            @Override public void onClick(View v) { chooseScreens(Screens.EXTERNAL); }
        }));
        root.addView(button(t("This box's own screen", "本机自己的屏幕", "Layar mesin ini"), new View.OnClickListener() {
            @Override public void onClick(View v) { chooseScreens(Screens.MAIN); }
        }));
        root.addView(button(t("Both screens", "两个屏幕", "Kedua layar"), new View.OnClickListener() {
            @Override public void onClick(View v) { chooseScreens(Screens.BOTH); }
        }));
        root.addView(button(t("Test: show a red banner on the screens for 6 seconds", "测试：在屏幕上显示红色横幅6秒", "Tes: tampilkan spanduk merah di layar selama 6 detik"), new View.OnClickListener() {
            @Override public void onClick(View v) { testBanner(); }
        }));
        root.addView(button(t("Test: play a gift on the screens (no server needed)", "测试：在屏幕上播放礼物（无需服务器）", "Tes: putar hadiah di layar (tanpa server)"), new View.OnClickListener() {
            @Override public void onClick(View v) { testGift(); }
        }));
        root.addView(button(t("Start the overlay now", "立即启动叠加", "Mulai overlay sekarang"), new View.OnClickListener() {
            @Override public void onClick(View v) { startOverlay(); }
        }));
        root.addView(button(t("Stop the overlay", "停止叠加", "Hentikan overlay"), new View.OnClickListener() {
            @Override public void onClick(View v) { OverlayService.stop(MainActivity.this); refresh(); }
        }));
        root.addView(button(t("Unlink this box", "取消链接", "Putuskan tautan"), new View.OnClickListener() {
            @Override public void onClick(View v) { OverlayService.stop(MainActivity.this); Link.unlink(MainActivity.this); refresh(); }
        }));

        root.addView(label(t("App address (change only for another company's own address):", "应用地址（仅在其他公司使用自己的地址时修改）：", "Alamat aplikasi (ubah hanya untuk alamat perusahaan lain):"), 16, false));
        serverField = new EditText(this);
        serverField.setSingleLine(true);
        serverField.setTextColor(Color.WHITE);
        serverField.setText(Link.server(this));
        root.addView(serverField);
        root.addView(button(t("Save the address", "保存地址", "Simpan alamat"), new View.OnClickListener() {
            @Override public void onClick(View v) { Link.saveServer(MainActivity.this, serverField.getText().toString()); refresh(); }
        }));

        ScrollView scroll = new ScrollView(this);
        scroll.addView(root);
        setContentView(scroll);
    }

    private String screenChoiceName() {
        String choice = Link.screens(this);
        if (Screens.MAIN.equals(choice)) return t("this box's own screen", "本机自己的屏幕", "layar mesin ini");
        if (Screens.BOTH.equals(choice)) return t("both screens", "两个屏幕", "kedua layar");
        return t("the HDMI / TV screen", "HDMI / 电视屏幕", "layar HDMI / TV");
    }

    private TextView label(String text, int sp, boolean bold) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextSize(sp);
        view.setTextColor(Color.WHITE);
        if (bold) view.setTypeface(Typeface.DEFAULT_BOLD);
        view.setPadding(0, 16, 0, 16);
        return view;
    }

    private Button button(String text, View.OnClickListener onClick) {
        Button view = new Button(this);
        view.setText(text);
        view.setAllCaps(false);
        view.setOnClickListener(onClick);
        return view;
    }

    private void askOverlayPermission() {
        if (Build.VERSION.SDK_INT < 23 || OverlayService.canDraw(this)) { refresh(); return; }
        try {
            startActivity(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + getPackageName())));
        } catch (RuntimeException e) {
            status.setText(t("This box has no screen for that permission. Open Settings > Apps > Reborn TV Overlay > allow \"Display over other apps\".",
                    "本机没有该权限的设置页面。请打开 设置 > 应用 > Reborn TV Overlay > 允许“显示在其他应用上方”。",
                    "Perangkat ini tidak punya layar izin itu. Buka Pengaturan > Aplikasi > Reborn TV Overlay > izinkan \"Tampil di atas aplikasi lain\"."));
        }
    }

    private void openAccessibilitySettings() {
        try {
            startActivity(new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS));
            status.setText(t("Find \"Reborn TV Overlay\" in the list and switch it on.", "在列表中找到“Reborn TV Overlay”并打开。", "Cari \"Reborn TV Overlay\" di daftar lalu aktifkan."));
        } catch (RuntimeException e) {
            status.setText(t("This box has no Accessibility screen either.", "本机也没有“无障碍”页面。", "Perangkat ini juga tidak punya layar Aksesibilitas."));
        }
    }

    private void startOverlay() {
        if (OverlayAccessibilityService.isEnabled(this)) { refresh(); return; } // the accessibility service shows the page by itself once the box is linked
        if (!OverlayService.canShow(this)) {
            askOverlayPermission();
            return;
        }
        if (!Link.isLinked(this)) { startPairing(); return; }
        OverlayService.start(this);
        ui.postDelayed(new Runnable() { @Override public void run() { refresh(); } }, 800);
    }

    /** Shows a code and waits until the admin types it next to a TV screen in the app; then this box is linked. */
    private void startPairing() {
        Link.saveServer(this, serverField.getText().toString());
        pairing = false;
        pairing = true;
        final android.content.Context context = getApplicationContext();
        new Thread(new Runnable() {
            @Override public void run() {
                String code = "";
                while (pairing) {
                    try {
                        if (code.isEmpty()) {
                            code = Link.newCode(context);
                            final String shown = code.substring(0, 3) + " " + code.substring(3);
                            ui.post(new Runnable() { @Override public void run() { codeView.setText(shown); } });
                        }
                        String answer = Link.poll(context, code);
                        if ("linked".equals(answer)) {
                            pairing = false;
                            ui.post(new Runnable() { @Override public void run() { codeView.setText(""); startOverlay(); startConnectorIfLinked(); refresh(); } });
                        } else if ("expired".equals(answer)) {
                            code = "";
                        }
                    } catch (Exception e) {
                        final String problem = e.getClass().getSimpleName();
                        ui.post(new Runnable() { @Override public void run() {
                            status.setText(t("Cannot reach the app (" + problem + "). Check this box's internet.", "无法连接应用（" + problem + "）。请检查本机网络。", "Tidak bisa terhubung ke aplikasi (" + problem + "). Periksa internet perangkat ini."));
                        } });
                    }
                    try { Thread.sleep(POLL_MS); } catch (InterruptedException ignored) { return; }
                }
            }
        }).start();
    }

    private void showCloudSetting(Button button) {
        button.setText(BridgeSettings.isShowCloud(this)
                ? t("Cloud songs: SHOWN (tap to hide them)", "云端歌曲：显示（点击隐藏）", "Lagu cloud: DITAMPILKAN (ketuk untuk menyembunyikan)")
                : t("Cloud songs: HIDDEN, only songs stored on the box (tap to show cloud songs too)", "云端歌曲：隐藏，仅显示本机存储的歌曲（点击同时显示云端歌曲）", "Lagu cloud: DISEMBUNYIKAN, hanya lagu di mesin (ketuk untuk menampilkan lagu cloud)"));
    }

    /** Who plays the songs: the box's own program (this app is its touch screen) or this app's own player (videos in the Karaoke folder / YouTube). */
    private void showPlaybackSetting(Button button) {
        button.setText(BridgeSettings.isBoxPlayback(this)
                ? t("Songs are played by: THE BOX'S OWN PROGRAM (press and hold to use this app's player instead)", "歌曲由：点歌机自带程序播放（长按改用本应用播放器）", "Lagu diputar oleh: PROGRAM BAWAAN MESIN (tahan lama untuk memakai pemutar aplikasi ini)")
                : t("Songs are played by: THIS APP'S PLAYER, which only plays video files in the Karaoke folder (press and hold to use the box's own program instead)", "歌曲由：本应用播放器播放，它只播放 Karaoke 文件夹里的视频（长按改用点歌机自带程序）", "Lagu diputar oleh: PEMUTAR APLIKASI INI, hanya memutar video di folder Karaoke (tahan lama untuk memakai program bawaan mesin)"));
    }

    /** Writes what the two voice buttons currently mean; `channels` may be null before it exists. */
    private void showVoiceSettings(Button side, Button channels) {
        side.setText(t("The singer's own voice is on the: ", "原唱在：", "Suara asli penyanyi ada di: ")
                + (BridgeSettings.isVoiceFirst(this) ? t("first track / left channel (tap to change)", "第一音轨 / 左声道（点击更改）", "trek pertama / kanal kiri (ketuk untuk ganti)")
                : t("second track / right channel (tap to change)", "第二音轨 / 右声道（点击更改）", "trek kedua / kanal kanan (ketuk untuk ganti)")));
        if (channels == null) return;
        channels.setText(BridgeSettings.isChannelVoice(this)
                ? t("Videos with one stereo track: voice and music on separate channels (ON, tap to turn off)", "单音轨立体声视频：人声与伴奏分左右声道（已开，点击关闭）", "Video satu trek stereo: suara dan musik di kanal terpisah (AKTIF, ketuk untuk mematikan)")
                : t("Videos with one stereo track: voice and music on separate channels (OFF, tap to turn on)", "单音轨立体声视频：人声与伴奏分左右声道（已关，点击开启）", "Video satu trek stereo: suara dan musik di kanal terpisah (MATI, ketuk untuk mengaktifkan)"));
    }

    /** One code links the TV screen and the song system: when the code brought the song system's key, the connector starts too (not while the built-in player is used). */
    private void startConnectorIfLinked() {
        if (BridgeSettings.isReady(this) && !BridgeSettings.isPlayerMode(this)) startConnector();
    }

    private void startConnector() {
        if (!BridgeSettings.isReady(this)) { startConnectorPairing(); return; }
        BridgeService.start(this);
        ui.postDelayed(new Runnable() { @Override public void run() { refreshConnector(); } }, 800);
    }

    private void saveTokenAndStart() {
        String token = tokenField.getText().toString().trim();
        if (token.isEmpty()) return;
        BridgeSettings.save(this, Link.server(this), token, "");
        tokenField.setText("");
        startConnector();
    }

    /** Shows a code and waits until the admin types it in Admin > Requests > Karaoke system; the box then receives the app address and key. */
    private void startConnectorPairing() {
        Link.saveServer(this, serverField.getText().toString());
        connectorPairing = false;
        connectorPairing = true;
        final android.content.Context context = getApplicationContext();
        new Thread(new Runnable() {
            @Override public void run() {
                String code = "";
                while (connectorPairing) {
                    try {
                        if (code.isEmpty()) {
                            code = Link.newCode(context);
                            final String shown = code.substring(0, 3) + " " + code.substring(3);
                            ui.post(new Runnable() { @Override public void run() { connectorCode.setText(shown); } });
                        }
                        String answer = Link.pollConnector(context, code);
                        if ("linked".equals(answer)) {
                            connectorPairing = false;
                            ui.post(new Runnable() { @Override public void run() { connectorCode.setText(""); startConnector(); } });
                        } else if ("expired".equals(answer) || "wrong".equals(answer)) {
                            code = "";
                        }
                    } catch (Exception e) {
                        final String problem = e.getClass().getSimpleName();
                        ui.post(new Runnable() { @Override public void run() {
                            connectorStatus.setText(t("Cannot reach the app (" + problem + "). Check this box's internet.", "无法连接应用（" + problem + "）。请检查本机网络。", "Tidak bisa terhubung ke aplikasi (" + problem + "). Periksa internet perangkat ini."));
                        } });
                    }
                    try { Thread.sleep(POLL_MS); } catch (InterruptedException ignored) { return; }
                }
            }
        }).start();
    }

    private void refreshConnector() {
        String linked = BridgeSettings.isReady(this) ? t("linked", "已链接", "terhubung") : t("not linked", "未链接", "belum terhubung");
        String running = BridgeService.running ? t("RUNNING", "运行中", "BERJALAN") : t("stopped", "已停止", "berhenti");
        connectorStatus.setText(t("App: ", "应用：", "Aplikasi: ") + linked
                + "\n" + t("Connector: ", "连接器：", "Konektor: ") + running
                + (BridgeService.status.isEmpty() ? "" : "\n" + BridgeService.status)
                + "\n" + BridgeService.recentLines(CONNECTOR_LINES_SHOWN));
    }

    private final Runnable connectorTick = new Runnable() {
        @Override public void run() {
            refreshConnector();
            refresh();
            ui.postDelayed(this, CONNECTOR_REFRESH_MS);
        }
    };

    /** Draws a plain banner through whichever overlay is on (Accessibility first): shows whether this box lets a window cover the karaoke picture, whatever the gift page does. */
    private void testBanner() {
        OverlayWindows windows = OverlayAccessibilityService.windowsNow != null ? OverlayAccessibilityService.windowsNow : OverlayService.windowsNow;
        if (windows == null) {
            OverlayLog.add("test: no overlay is on yet (switch Reborn TV Overlay on in Accessibility, or start the overlay)");
        } else {
            OverlayLog.add("test: banner asked");
            windows.banner(t("TEST BANNER - gifts will show here", "测试横幅 - 礼物将显示在这里", "SPANDUK TES - hadiah tampil di sini"), TEST_BANNER_MS);
        }
        refresh();
    }

    private void testGift() {
        OverlayWindows windows = OverlayAccessibilityService.windowsNow != null ? OverlayAccessibilityService.windowsNow : OverlayService.windowsNow;
        if (windows == null) OverlayLog.add("test: no overlay is on yet");
        else windows.testGift();
        refresh();
    }

    private void chooseScreens(String choice) {
        Link.saveScreens(this, choice);
        if (OverlayService.running) {
            OverlayService.stop(this);
            ui.postDelayed(new Runnable() { @Override public void run() { startOverlay(); refresh(); } }, 500);
        }
        refresh();
    }

    /** An app built with the club's box key links itself when it opens: no code to type. */
    private void linkByItself() {
        if (!Enroll.isAvailable() || (Link.isLinked(this) && BridgeSettings.isReady(this))) return;
        Enroll.start(this, new Enroll.Done() {
            @Override public void onLinked() {
                ui.post(new Runnable() {
                    @Override public void run() {
                        startOverlay();
                        startConnectorIfLinked();
                        refresh();
                    }
                });
            }
        });
    }

    private void refresh() {
        String allowed = OverlayService.canDraw(this) ? t("allowed", "已允许", "diizinkan") : t("NOT allowed yet", "尚未允许", "belum diizinkan");
        String linked = Link.isLinked(this) ? t("linked", "已链接", "terhubung") : t("not linked", "未链接", "belum terhubung");
        boolean viaAccessibility = OverlayAccessibilityService.isEnabled(this);
        if (viaAccessibility) allowed = t("allowed (Accessibility)", "已允许（无障碍）", "diizinkan (Aksesibilitas)");
        String running = (OverlayService.running || (viaAccessibility && OverlayAccessibilityService.running && Link.isLinked(this))) ? t("RUNNING", "运行中", "BERJALAN") : t("stopped", "已停止", "berhenti");
        status.setText(t("Drawing over other apps: ", "显示在其他应用上方：", "Tampil di atas aplikasi lain: ") + allowed
                + "\n" + t("TV screen: ", "电视屏幕：", "Layar TV: ") + linked
                + "\n" + t("Overlay: ", "叠加：", "Overlay: ") + running
                + "\n" + t("Gifts on: ", "礼物显示在：", "Hadiah di: ") + screenChoiceName()
                + "\n" + t("Accessibility service: ", "无障碍服务：", "Layanan Aksesibilitas: ") + (OverlayAccessibilityService.running ? t("running", "运行中", "berjalan") : t("not running", "未运行", "tidak berjalan"))
                + "\n" + t("Screens of this box:\n", "本机的屏幕：\n", "Layar mesin ini:\n") + Screens.describe(this)
                + t("What the overlay did:\n", "叠加的动作：\n", "Yang dilakukan overlay:\n") + OverlayLog.recent(OVERLAY_LINES_SHOWN)
                + "\n" + Link.server(this));
    }

    @Override
    protected void onResume() {
        super.onResume();
        linkByItself();
        refresh();
        if (BridgeSettings.isReady(this) && !BridgeSettings.isPlayerMode(this) && !BridgeService.running) BridgeService.start(this);
        ui.removeCallbacks(connectorTick);
        ui.post(connectorTick);
        if (Link.isLinked(this) && OverlayService.canShow(this) && !OverlayService.running && !OverlayAccessibilityService.isEnabled(this)) startOverlay();
    }

    @Override
    protected void onPause() {
        ui.removeCallbacks(connectorTick);
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        pairing = false;
        connectorPairing = false;
        super.onDestroy();
    }
}
