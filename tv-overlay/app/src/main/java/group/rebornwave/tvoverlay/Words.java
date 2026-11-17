package group.rebornwave.tvoverlay;

import java.util.Locale;

/** Texts drawn by the app itself: English, 中文, Bahasa Indonesia. */
final class Words {
    private Words() {}

    static String t(String en, String zh, String id) {
        String language = Locale.getDefault().getLanguage();
        if ("zh".equals(language)) return zh;
        if ("in".equals(language) || "id".equals(language)) return id;
        return en;
    }
}
