import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { RebornLayout } from "@/components/RebornLayout";
import { useTranslation } from "@/lib/i18n";
import { EventPoster, EventViewer } from "@/components/Events";
import { Megaphone } from "lucide-react";

// All upcoming events, nearest date first (finished ones drop off). Tap a poster for the full event.
export default function RebornEvents() {
  const { t } = useTranslation();
  const [open, setOpen] = useState<any>(null);
  const { data: events = [], isLoading } = useQuery<any[]>({ queryKey: ["/api/reborn/events"], queryFn: () => apiRequest("GET", "/api/reborn/events").then((r) => r.json()) });
  return (
    <RebornLayout active="/events" title={t("ev.page.title")}>
      <div className="flex items-center gap-2 mb-4">
        <span className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}><Megaphone className="w-5 h-5" /></span>
        <div><h1 className="text-xl font-extrabold leading-none">{t("ev.page.heading")}</h1><p className="text-sm text-white/50">{t("ev.page.sub")}</p></div>
      </div>
      {!isLoading && events.length === 0 && (
        <div className="text-center py-16 text-white/40"><Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>{t("ev.page.empty")}</p></div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {events.map((ev) => <EventPoster key={ev.id} ev={ev} onOpen={() => setOpen(ev)} />)}
      </div>
      {open && <EventViewer ev={open} onClose={() => setOpen(null)} />}
    </RebornLayout>
  );
}
