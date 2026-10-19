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
 * Set-up screen of the overlay on the karaoke box: allow drawing over other apps, link to a TV screen of the app with a code
 * (the same way a TV is linked in a streaming app), and start / stop the overlay. After that the overlay starts by itself with the box.
 */
public class MainActivity extends Activity {
    private static final int TEXT_SP = 20;
    private static final int CODE_SP = 64;
    private static final long POLL_MS = 2000;

    private final Handler ui = new Handler(Looper.getMainLooper());
    private volatile boolean pairing = false;
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
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(48, 48, 48, 48);
        root.setBackgroundColor(Color.parseColor("#12091f"));

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
        if (!OverlayService.canDraw(this)) {
            if (OverlayAccessibilityService.isEnabled(this)) { refresh(); return; } // the accessibility service shows the page by itself once the box is linked
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
                            ui.post(new Runnable() { @Override public void run() { codeView.setText(""); startOverlay(); refresh(); } });
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

    private void refresh() {
        String allowed = OverlayService.canDraw(this) ? t("allowed", "已允许", "diizinkan") : t("NOT allowed yet", "尚未允许", "belum diizinkan");
        String linked = Link.isLinked(this) ? t("linked", "已链接", "terhubung") : t("not linked", "未链接", "belum terhubung");
        boolean viaAccessibility = OverlayAccessibilityService.isEnabled(this);
        if (viaAccessibility) allowed = t("allowed (Accessibility)", "已允许（无障碍）", "diizinkan (Aksesibilitas)");
        String running = (OverlayService.running || (viaAccessibility && OverlayAccessibilityService.running && Link.isLinked(this))) ? t("RUNNING", "运行中", "BERJALAN") : t("stopped", "已停止", "berhenti");
        status.setText(t("Drawing over other apps: ", "显示在其他应用上方：", "Tampil di atas aplikasi lain: ") + allowed
                + "\n" + t("TV screen: ", "电视屏幕：", "Layar TV: ") + linked
                + "\n" + t("Overlay: ", "叠加：", "Overlay: ") + running
                + "\n" + Link.server(this));
    }

    @Override
    protected void onResume() {
        super.onResume();
        refresh();
        if (Link.isLinked(this) && OverlayService.canDraw(this) && !OverlayService.running && !OverlayAccessibilityService.isEnabled(this)) startOverlay();
    }

    @Override
    protected void onDestroy() {
        pairing = false;
        super.onDestroy();
    }
}
