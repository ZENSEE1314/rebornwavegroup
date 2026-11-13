import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/lib/i18n";
import { canVibrate, unlockAlarm, useAlarmReady } from "@/lib/staff-alarm";

// Staff and admins: until the page has been touched once a phone will not beep or vibrate for an alert, so a bar asks for that one tap.
export function AlarmEnableBar() {
  const { user } = useAuth();
  const role = (user as any)?.role;
  const isStaff = role === "admin" || role === "staff";
  const { t } = useTranslation();
  const isReady = useAlarmReady(isStaff);
  if (!isStaff || isReady) return null;
  return (
    <button type="button" onClick={unlockAlarm} className="fixed inset-x-2 bottom-24 z-[70] rounded-2xl border border-orange-400/70 bg-orange-950/95 p-3 text-left text-sm font-bold text-white shadow-2xl">
      {t("hm.alarm.enable")}
      {!canVibrate() && <span className="mt-1 block text-[11px] font-normal text-white/70">{t("hm.alarm.noVibrate")}</span>}
    </button>
  );
}
