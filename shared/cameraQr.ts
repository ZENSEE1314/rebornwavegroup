// What a CCTV camera's QR code holds (the sticker on it, or a screenshot from its app), worked out so the camera can be added without typing.
// A web address is added straight away; a video address (rtsp) or the maker's cloud ID cannot be shown in a browser, so the admin is told what to do instead.
export type CameraQr =
  | { type: "web"; url: string; kind: "image" | "page"; name: string }
  | { type: "video"; rtsp: string }
  | { type: "cloudId"; id: string; brand: string }
  | { type: "unknown"; raw: string };

const IMAGE_PATH = /snapshot|mjpe?g|\.jpe?g|video\.cgi|image\.cgi|cgi-bin\/(snap|mjpg)/i;
const CLOUD_HOSTS: Array<[RegExp, string]> = [
  [/ezviz|ys7\./i, "Ezviz"], [/hik-?connect|hikvision/i, "Hik-Connect"], [/tuya|smartlife|smart-life/i, "Tuya / Smart Life"], [/imou|dahua|lechange/i, "Imou"],
  [/xmeye|xmeyecloud|icsee|vmeye/i, "XMEye / iCSee"], [/reolink/i, "Reolink"], [/tapo|tplink/i, "Tapo"], [/yoosee|vstarcam|eye4/i, "Yoosee / Eye4"],
];
const IPV4 = /^(\d{1,3}(?:\.\d{1,3}){3})(?::(\d{2,5}))?(?:\/.*)?$/;
const HEX_UID = /^[0-9a-f]{16}$/i;
const NINE_DIGITS = /^\d{9}$/;
const SERIAL = /^[A-Za-z0-9-]{8,32}$/;
const MAX_NAME = 60;

const brandOfHost = (text: string) => CLOUD_HOSTS.find(([re]) => re.test(text))?.[1] || "";
const validIp = (ip: string) => ip.split(".").every((part) => Number(part) <= 255);

function fields(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const json = JSON.parse(text);
    if (json && typeof json === "object") for (const [k, v] of Object.entries(json)) if (typeof v === "string" || typeof v === "number") out[k.toLowerCase()] = String(v);
    return out;
  } catch { /* not JSON */ }
  for (const part of text.split(/[;,&\n|]/)) {
    const m = /^\s*([A-Za-z_ ]{1,20})\s*[:=]\s*(.+?)\s*$/.exec(part);
    if (m) out[m[1].trim().toLowerCase().replace(/\s+/g, "_")] = m[2];
  }
  return out;
}

export function parseCameraQr(input: string): CameraQr {
  const raw = String(input ?? "").trim();
  if (!raw) return { type: "unknown", raw };
  if (/^rtsp:\/\//i.test(raw)) return { type: "video", rtsp: raw };
  if (/^https?:\/\//i.test(raw)) {
    const brand = brandOfHost(raw);
    try {
      const url = new URL(raw);
      if (brand) {
        const id = url.searchParams.get("sn") || url.searchParams.get("uid") || url.searchParams.get("id") || url.pathname.split("/").filter(Boolean).pop() || "";
        return { type: "cloudId", id, brand };
      }
      return { type: "web", url: raw, kind: IMAGE_PATH.test(url.pathname + url.search) ? "image" : "page", name: url.hostname.slice(0, MAX_NAME) };
    } catch { return { type: "unknown", raw }; }
  }
  const bare = IPV4.exec(raw);
  if (bare && validIp(bare[1])) return { type: "web", url: `http://${bare[1]}${bare[2] ? `:${bare[2]}` : ""}/`, kind: "page", name: bare[1] };
  const f = fields(raw);
  const host = f.ip || f.host || f.address || f.addr;
  if (host && IPV4.test(host)) {
    const m = IPV4.exec(host)!;
    const port = f.port || m[2];
    return { type: "web", url: `http://${m[1]}${port ? `:${port}` : ""}/`, kind: "page", name: f.name?.slice(0, MAX_NAME) || m[1] };
  }
  const id = f.uid || f.serial || f.sn || f.id || f.device_id;
  if (id) return { type: "cloudId", id, brand: brandOfHost(raw) };
  if (HEX_UID.test(raw)) return { type: "cloudId", id: raw, brand: "XMEye / iCSee" };
  if (NINE_DIGITS.test(raw)) return { type: "cloudId", id: raw, brand: "Ezviz / Hik-Connect" };
  if (SERIAL.test(raw) && /\d/.test(raw)) return { type: "cloudId", id: raw, brand: "" };
  return { type: "unknown", raw };
}
