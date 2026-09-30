import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { useTranslation, getCurrentLanguage } from "@/lib/i18n";

// Default entry for a business without its own domain:
//   https://<host>/t/<slug>  → branded login into that business's app.
export default function TenantEntry() {
  const [, params] = useRoute("/t/:slug");
  const slug = params?.slug || "";
  const [tenant, setTenant] = useState<any>(null);
  const [error, setError] = useState("");
  const { t } = useTranslation();

  useEffect(() => {
    fetch(`/api/v1/tenant/resolve?slug=${encodeURIComponent(slug)}`, { headers: { "X-Lang": getCurrentLanguage() } }).then(async (r) => {
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d?.message || t("vn.tenant.notFound")); return; }
      setTenant(d);
      try { localStorage.setItem("bridgexTenantSlug", slug); } catch {}
    }).catch(() => setError(t("vn.otable.networkError")));
  }, [slug]);

  const primary = tenant?.theme?.primaryColor || "#06b6d4";
  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-white" style={{ background: "radial-gradient(120% 100% at 50% 0%, #141024 0%, #0a0714 60%)" }}>
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/[.04] p-8 text-center">
        {error ? <p className="text-amber-300">{error}</p> : !tenant ? <p className="text-white/50">{t("vn.common.loading")}</p> : (<>
          {tenant.logoUrl ? <img src={tenant.logoUrl} className="mx-auto mb-4 h-16 w-16 rounded-2xl object-cover" alt="" /> : <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl text-2xl font-black text-black" style={{ background: primary }}>{(tenant.appName || tenant.name || "?")[0]}</div>}
          <h1 className="text-2xl font-extrabold">{tenant.appName || tenant.name}</h1>
          <p className="mt-2 text-sm text-white/50">{t("vn.tenant.signInHere")}</p>
          <a href="/login" className="mt-6 inline-block rounded-xl px-6 py-3 font-bold text-black" style={{ background: primary }}>{t("vn.tenant.logIn")}</a>
        </>)}
      </div>
    </div>
  );
}
