import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { CalendarCheck, UtensilsCrossed, Gift, Crown, ShoppingBag, UserRound, MapPin, type LucideIcon } from "lucide-react";

import { LanguageSelector } from "@/components/LanguageSelector";
import { rememberTenantSlug } from "@/hooks/useTenantBrand";
import { applyAppSkin } from "@/lib/appSkin";
import { useTranslation, getCurrentLanguage } from "@/lib/i18n";
import { APP_SKINS, DEFAULT_APP_SKIN } from "@shared/appSkins";

interface Tenant {
  slug: string;
  name: string;
  app_name?: string;
  logo_url?: string;
  theme?: { primaryColor?: string; accentColor?: string; skin?: string };
  modules?: string[];
  data_mode?: string;
  server_url?: string | null;
  branches?: { name: string; address?: string | null }[];
}

const DEFAULT_PRIMARY = "#06b6d4";
const DEFAULT_ACCENT = "#f59e0b";

// Customer-facing features, shown when the business has any of the listed modules on.
const FEATURES: { key: string; icon: LucideIcon; modules: string[] }[] = [
  { key: "booking", icon: CalendarCheck, modules: ["booking", "beauty", "ktv", "hotel", "gym", "pet", "workshop"] },
  { key: "order", icon: UtensilsCrossed, modules: ["restaurant", "qr_ordering", "foodcourt"] },
  { key: "rewards", icon: Gift, modules: ["loyalty"] },
  { key: "member", icon: Crown, modules: ["membership"] },
  { key: "shop", icon: ShoppingBag, modules: ["retail", "grocery"] },
];

// A business's own web page when it has no domain yet:
//   https://<host>/t/<slug>  → what it offers, where it is, and its branded login.
export default function TenantEntry() {
  const [, params] = useRoute("/t/:slug");
  const slug = (params?.slug || "").toLowerCase();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [error, setError] = useState("");
  const { t } = useTranslation();

  useEffect(() => {
    fetch(`/api/v1/tenant/resolve?slug=${encodeURIComponent(slug)}`, { headers: { "X-Lang": getCurrentLanguage() } }).then(async (r) => {
      const d = await r.json().catch(() => ({}));
      // An unknown slug falls back to the flagship company server-side; that is "not found" here.
      if (!r.ok || d?.slug !== slug) { setError(d?.message && !r.ok ? d.message : t("vn.tenant.notFound")); return; }
      // A company with its own server lives there, not on this platform.
      if (d.data_mode === "dedicated" && d.server_url) { window.location.replace(d.server_url); return; }
      setTenant(d);
      document.title = d.app_name || d.name;
      rememberTenantSlug(slug);
      applyAppSkin(d.theme?.skin || "");
    }).catch(() => setError(t("vn.otable.networkError")));
  }, [slug]);

  if (error || !tenant) {
    return (
      <div className="rwg-tenant flex min-h-screen items-center justify-center p-6 text-white">
        <p className={error ? "text-amber-300" : "text-white/50"}>{error || t("vn.common.loading")}</p>
      </div>
    );
  }

  const name = tenant.app_name || tenant.name;
  // A chosen app design brings its own colours; without one the company's two brand colours are used.
  const skin = APP_SKINS.find((s) => s.id === tenant.theme?.skin && s.id !== DEFAULT_APP_SKIN);
  const primary = skin?.accent || tenant.theme?.primaryColor || DEFAULT_PRIMARY;
  const accent = skin?.accentSoft || tenant.theme?.accentColor || DEFAULT_ACCENT;
  const modules = tenant.modules || [];
  const features = FEATURES.filter((f) => f.modules.some((m) => modules.includes(m)));
  const branches = (tenant.branches || []).filter((b) => b.name);
  const logo = tenant.logo_url
    ? <img src={tenant.logo_url} className="h-full w-full object-cover" alt="" />
    : <span className="font-black" style={{ color: "#0a0714" }}>{name.charAt(0).toUpperCase()}</span>;

  return (
    <div className="rwg-tenant min-h-screen text-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl text-lg" style={{ background: primary }}>{logo}</div>
          <b className="truncate text-lg">{name}</b>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <LanguageSelector />
          <a href="/login" className="rounded-xl px-4 py-2.5 text-sm font-bold text-black" style={{ background: primary }}>{t("vn.tenant.logIn")}</a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-16">
        <section className="py-14 text-center md:py-20">
          <div className="mx-auto mb-6 grid h-24 w-24 place-items-center overflow-hidden rounded-3xl text-5xl shadow-2xl" style={{ background: primary, boxShadow: `0 20px 60px ${primary}55` }}>{logo}</div>
          <h1 className="text-4xl font-extrabold leading-tight md:text-6xl">{t("vn.tenant.welcome", { name })}</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/60">{t("vn.tenant.heroSub")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="/login" className="min-h-[44px] rounded-xl px-7 py-3 font-bold text-black" style={{ background: primary }}>{t("vn.tenant.logIn")}</a>
            <a href="/login?tab=register" className="min-h-[44px] rounded-xl border px-7 py-3 font-bold" style={{ borderColor: `${accent}99`, color: accent }}>{t("vn.tenant.signUp")}</a>
          </div>
        </section>

        <section>
          <h2 className="mb-5 text-center text-2xl font-bold">{t("vn.tenant.whatYouCanDo")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...features, { key: "account", icon: UserRound }].map(({ key, icon: Icon }) => (
              <article key={key} className="rwg-tenant-card rounded-2xl border border-white/10 bg-white/[.04] p-5">
                <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl" style={{ background: `${primary}22`, color: primary }}><Icon className="h-5 w-5" /></div>
                <h3 className="font-bold">{t(`vn.tenant.f.${key}.t`)}</h3>
                <p className="mt-1 text-sm text-white/55">{t(`vn.tenant.f.${key}.d`, { name })}</p>
              </article>
            ))}
          </div>
        </section>

        {branches.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-5 text-center text-2xl font-bold">{t("vn.tenant.findUs")}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {branches.map((b) => (
                <article key={b.name} className="rwg-tenant-card flex gap-3 rounded-2xl border border-white/10 bg-white/[.04] p-5">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0" style={{ color: accent }} />
                  <div className="min-w-0">
                    <h3 className="font-bold">{b.name}</h3>
                    {b.address && <p className="mt-1 text-sm text-white/55">{b.address}</p>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="rwg-tenant-card mt-12 rounded-3xl border border-white/10 p-8 text-center" style={{ background: `linear-gradient(135deg, ${primary}26, ${accent}1f)` }}>
          <h2 className="text-2xl font-bold">{t("vn.tenant.ready")}</h2>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <a href="/login" className="min-h-[44px] rounded-xl px-7 py-3 font-bold text-black" style={{ background: primary }}>{t("vn.tenant.logIn")}</a>
            <a href="/login?tab=register" className="min-h-[44px] rounded-xl border px-7 py-3 font-bold" style={{ borderColor: `${accent}99`, color: accent }}>{t("vn.tenant.signUp")}</a>
          </div>
        </section>
      </main>

      <footer className="pb-8 text-center text-xs text-white/35">© {new Date().getFullYear()} {name} · {t("vn.tenant.poweredBy")}</footer>
    </div>
  );
}
