import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { OnboardingWalkthrough, STAFF_STEPS } from "@/components/OnboardingWalkthrough";

// Admin-only button that opens the POS + admin guide (texts: admin.guide.* in i18n/admin.ts).
// Callers decide who sees it; today that's full admins only.
export function StaffGuideButton({ compact }: { compact?: boolean }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      {compact
        ? <button onClick={() => setOpen(true)} className="kos-dark" style={{ padding: "9px 12px" }}><HelpCircle className="w-4 h-4" /> {t("admin.guide.open")}</button>
        : <button onClick={() => setOpen(true)} className="arc-tile w-full mb-4 text-left" style={{ ["--c1" as any]: "#f3c14b", ["--c2" as any]: "#b45309" }}>
            <span className="arc-icon"><span><HelpCircle className="w-7 h-7 text-white" /></span></span>
            <span className="arc-title flex-1 min-w-0" style={{ fontSize: 16 }}>{t("admin.guide.open")}</span>
            <span className="arc-play">›</span>
          </button>}
      {open && <OnboardingWalkthrough isOpen onClose={close} onComplete={close} steps={STAFF_STEPS} prefix="admin.guide" />}
    </>
  );
}
