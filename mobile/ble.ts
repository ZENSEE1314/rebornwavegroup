// Native Bluetooth for the Reborn app: answers the calls that mobile/bleShim.ts makes from the website (scan, connect, services,
// write, disconnect) with react-native-ble-plx, so the admin's LED-lights screen works inside the app too.
import { PermissionsAndroid, Platform } from "react-native";
import { BleManager, State, type Device } from "react-native-ble-plx";
import type WebView from "react-native-webview";
import { scanLan } from "./lanScan";
import { overlayAction } from "./tvOverlay";

const SCAN_MS = 6000;
// The control chips LED lights use (ELK-BLEDOM family FFF0, LEDBLE FFE0, Triones FFD5). A light that sends no name is still listed when it announces one of these.
const LIGHT_SERVICES = ["0000fff0", "0000ffe0", "0000ffd5", "fff0", "ffe0", "ffd5"];
const isLightChip = (uuids: string[] | null | undefined) => !!uuids?.some((uuid) => LIGHT_SERVICES.some((short) => uuid.toLowerCase().startsWith(short)));
const CONNECT_TIMEOUT_MS = 8000;

type Call = { ble: true; id: number; op: "scan" | "connect" | "disconnect" | "services" | "write" | "lanScan" | "overlay"; args: Record<string, unknown> };
interface ScanResult { id: string; name: string }

export const isBleMessage = (message: unknown): message is Call => !!message && typeof message === "object" && (message as { ble?: unknown }).ble === true;

async function askAndroidPermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  const wanted = Number(Platform.Version) >= 31
    ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]
    : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
  const answers = await PermissionsAndroid.requestMultiple(wanted);
  return wanted.every((permission) => answers[permission] === PermissionsAndroid.RESULTS.GRANTED);
}

export function createBleBridge(getWebView: () => WebView | null) {
  let manager: BleManager | null = null;
  const connected = new Map<string, Device>();
  const ble = () => (manager ??= new BleManager());

  const reply = (id: number, ok: boolean, payload: unknown) => {
    getWebView()?.injectJavaScript(`window.__rebornBleReply&&window.__rebornBleReply(${id},${ok},${JSON.stringify(payload)});true;`);
  };

  async function scan(): Promise<ScanResult[]> {
    if (!(await askAndroidPermissions())) throw new Error("Bluetooth permission was not given. Allow Nearby devices for this app in the phone's settings.");
    const state = await ble().state();
    if (state !== State.PoweredOn) throw new Error("Bluetooth is switched off. Turn it on and try again.");
    const found = new Map<string, ScanResult>();
    await new Promise<void>((resolve, reject) => {
      ble().startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
        if (error) { ble().stopDeviceScan(); reject(new Error(error.message)); return; }
        if (!device) return;
        const name = device.localName || device.name || (isLightChip(device.serviceUUIDs) ? `LED light ${device.id.slice(-5)}` : "");
        if (name) found.set(device.id, { id: device.id, name });
      });
      setTimeout(() => { ble().stopDeviceScan(); resolve(); }, SCAN_MS);
    });
    return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  async function connect(id: string): Promise<void> {
    const existing = connected.get(id);
    if (existing && (await existing.isConnected())) return;
    const device = await ble().connectToDevice(id, { timeout: CONNECT_TIMEOUT_MS });
    await device.discoverAllServicesAndCharacteristics();
    device.onDisconnected(() => {
      connected.delete(id);
      getWebView()?.injectJavaScript(`window.__rebornBleEvent&&window.__rebornBleEvent(${JSON.stringify(id)},"gattserverdisconnected");true;`);
    });
    connected.set(id, device);
  }

  const need = (id: string): Device => {
    const device = connected.get(id);
    if (!device) throw new Error("The light is not connected");
    return device;
  };

  async function run(call: Call): Promise<unknown> {
    const id = String(call.args.id ?? "");
    switch (call.op) {
      case "scan": return scan();
      case "lanScan": return scanLan();
      case "overlay": return overlayAction(String(call.args.action ?? ""), String(call.args.url ?? ""));
      case "connect": await connect(id); return true;
      case "services": return (await need(id).services()).map((service) => service.uuid.toLowerCase());
      case "write": {
        const device = need(id);
        const service = String(call.args.service);
        const characteristic = String(call.args.characteristic);
        const data = String(call.args.data);
        if (call.args.response === true) await device.writeCharacteristicWithResponseForService(service, characteristic, data);
        else await device.writeCharacteristicWithoutResponseForService(service, characteristic, data);
        return true;
      }
      case "disconnect": {
        connected.delete(id);
        await ble().cancelDeviceConnection(id).catch(() => undefined);
        return true;
      }
    }
  }

  return {
    async handle(call: Call) {
      try { reply(call.id, true, await run(call)); } catch (error) { reply(call.id, false, error instanceof Error ? error.message : String(error)); }
    },
  };
}
