import { Button } from "@/components/ui/button";
import { useTranslation, type Language } from "@/lib/i18n";

const labels: Record<Language, string> = {
  en: "EN",
  zh: "中文",
  id: "ID",
};

export function InvestorLanguageToggle() {
  const { language, changeLanguage } = useTranslation();
  const languages: Language[] = ["en", "zh", "id"];

  return (
    <div className="inline-flex rounded-full border border-white/10 bg-white/[0.06] p-1">
      {languages.map((item) => (
        <Button
          key={item}
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => changeLanguage(item)}
          className={`h-8 rounded-full px-3 text-xs font-bold ${
            language === item
              ? "bg-amber-400 text-slate-950 hover:bg-amber-300"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          {labels[item]}
        </Button>
      ))}
    </div>
  );
}
