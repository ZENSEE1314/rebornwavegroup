// The phone's own Wi-Fi scan (native code in mobile/modules/lan-scan, Android): finds CCTV cameras and TVs on the network the phone is
// connected to. Missing in an older app build, so it is looked up, never assumed.
import { requireOptionalNativeModule } from "expo";

export interface FoundDevice { ip: string; kind: "camera" | "tv"; name: string; model: string; rtsp: string; via: string }
interface LanScanNative { scan(listenMs: number): Promise<FoundDevice[]> }

const LISTEN_MS = 4000;
const native = requireOptionalNativeModule<LanScanNative>("LanScan");

export async function scanLan(): Promise<FoundDevice[]> {
  if (!native) throw new Error("This app version cannot scan the network yet. Install the latest Reborn app.");
  return native.scan(LISTEN_MS);
}
