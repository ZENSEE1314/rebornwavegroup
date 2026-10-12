// Camera brands for Admin › Security › Cameras. Every company may use a different CCTV brand, so a camera can be
// tagged with one of these (or "other" + a typed brand name). A brand only adds example stream addresses as a help;
// the camera itself is always just a web address, so ANY brand works as long as it gives an http(s) picture or page.
// Cameras that speak only RTSP need a converter (go2rtc) — that case is the "go2rtc" brand below.

export interface CameraBrand {
  id: string;
  name: string;
  /** Example snapshot / MJPEG address; <ip> is the camera's address on the venue network. */
  image: string;
  /** Example web-page address, when the brand has a usable one. */
  page?: string;
}

export const OTHER_BRAND = "other";

export const CAMERA_BRANDS: CameraBrand[] = [
  { id: "hikvision", name: "Hikvision", image: "http://<ip>/ISAPI/Streaming/channels/101/picture" },
  { id: "dahua", name: "Dahua / Amcrest", image: "http://<ip>/cgi-bin/snapshot.cgi" },
  { id: "uniview", name: "Uniview (UNV)", image: "http://<ip>/images/snapshot.jpg" },
  { id: "reolink", name: "Reolink", image: "http://<ip>/cgi-bin/api.cgi?cmd=Snap&channel=0&rs=rwg&user=<user>&password=<password>" },
  { id: "axis", name: "Axis", image: "http://<ip>/axis-cgi/mjpg/video.cgi" },
  { id: "hanwha", name: "Hanwha (Samsung Wisenet)", image: "http://<ip>/stw-cgi/video.cgi?msubmenu=snapshot&action=view" },
  { id: "foscam", name: "Foscam", image: "http://<ip>:88/cgi-bin/CGIProxy.fcgi?cmd=snapPicture2&usr=<user>&pwd=<password>" },
  { id: "unifi", name: "Ubiquiti UniFi Protect", image: "http://<ip>/snap.jpeg" },
  { id: "tapo", name: "TP-Link Tapo / VIGI", image: "http://<go2rtc-pc>:1984/api/frame.jpeg?src=<camera>", page: "http://<go2rtc-pc>:1984/stream.html?src=<camera>" },
  { id: "ezviz", name: "EZVIZ", image: "http://<go2rtc-pc>:1984/api/frame.jpeg?src=<camera>", page: "http://<go2rtc-pc>:1984/stream.html?src=<camera>" },
  { id: "imou", name: "Imou", image: "http://<go2rtc-pc>:1984/api/frame.jpeg?src=<camera>", page: "http://<go2rtc-pc>:1984/stream.html?src=<camera>" },
  { id: "xiaomi", name: "Xiaomi / Mi Home", image: "http://<go2rtc-pc>:1984/api/frame.jpeg?src=<camera>", page: "http://<go2rtc-pc>:1984/stream.html?src=<camera>" },
  { id: "go2rtc", name: "Any RTSP camera (via go2rtc)", image: "http://<go2rtc-pc>:1984/api/stream.mjpeg?src=<camera>", page: "http://<go2rtc-pc>:1984/stream.html?src=<camera>" },
];

export const MAX_BRAND_NAME = 40;

/** Cleans what is saved on a camera: a known brand id, or "other" with the typed name, or empty. */
export function cleanCameraBrand(brand: unknown, brandName: unknown): { brand: string; brandName: string } {
  const id = typeof brand === "string" ? brand.trim() : "";
  if (CAMERA_BRANDS.some((item) => item.id === id)) return { brand: id, brandName: "" };
  if (id === OTHER_BRAND) return { brand: OTHER_BRAND, brandName: typeof brandName === "string" ? brandName.trim().slice(0, MAX_BRAND_NAME) : "" };
  return { brand: "", brandName: "" };
}

export const cameraBrand = (id: string): CameraBrand | undefined => CAMERA_BRANDS.find((item) => item.id === id);
