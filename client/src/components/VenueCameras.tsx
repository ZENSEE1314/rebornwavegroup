import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Radio } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";
import { panelCard } from "@/lib/security-types";

const PICTURE_EVERY_MS = 2000;
const LIST_EVERY_MS = 10_000;

interface VenueCamera { id: string; name: string; ageSeconds: number }

function LivePicture({ camera }: { camera: VenueCamera }) {
  const { t } = useTranslation();
  const [tick, setTick] = useState(() => Date.now());
  const [isBroken, setIsBroken] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setTick(Date.now()), PICTURE_EVERY_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="grow basis-72 rounded-xl overflow-hidden bg-black border border-white/10">
      <div className="px-3 py-2 text-xs font-semibold text-white/80">{camera.name}</div>
      <img alt={camera.name} src={`/api/reborn/security/venue-cameras/${encodeURIComponent(camera.id)}.jpg?_t=${tick}`} onError={() => setIsBroken(true)} onLoad={() => setIsBroken(false)} className="w-full aspect-video object-contain bg-black" />
      {isBroken && <p className="p-3 text-xs text-red-300">{t("admin.cam.live.offline")}</p>}
    </div>
  );
}

// Cameras at the venue, seen from anywhere: the camera program on the venue PC sends a picture to the app, and this shows it about every 2 seconds.
export default function VenueCameras() {
  const { t } = useTranslation();
  const { data } = useQuery<{ cameras: VenueCamera[] }>({
    queryKey: ["/api/reborn/security/venue-cameras"],
    queryFn: () => apiRequest("GET", "/api/reborn/security/venue-cameras").then((r) => r.json()),
    refetchInterval: LIST_EVERY_MS,
  });
  const cameras = data?.cameras ?? [];

  return (
    <div className={panelCard}>
      <h3 className="font-bold mb-1 flex items-center gap-2"><Radio className="w-4 h-4 text-emerald-300" /> {t("admin.cam.live.title")}</h3>
      <p className="text-[11px] text-white/50">{t("admin.cam.live.intro")}</p>
      {data && cameras.length === 0 && <p className="mt-3 text-xs text-white/50">{t("admin.cam.live.none")}</p>}
      <div className="mt-3 flex flex-wrap gap-3">{cameras.map((camera) => <LivePicture key={camera.id} camera={camera} />)}</div>
    </div>
  );
}
