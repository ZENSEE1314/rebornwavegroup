// Web Bluetooth connection to real lights (Chrome on Android and desktop). In the Reborn phone app the same calls are answered by the app's
// native Bluetooth (mobile/bleShim.ts + mobile/ble.ts); a plain iPhone browser has none.
// Every light is chosen by the admin once per visit in the browser's own device chooser; the hub then reconnects them as needed.
import type { LightInfo, LightLink } from "./hub";
import { DETECTION_SERVICES, PROFILES, chooseProfile, describeOtherServices, type LightProfile, type ProfileId } from "./protocols";

const CONNECT_TIMEOUT_MS = 8000;
const FRAME_GAP_MS = 40;

interface BtCharacteristic {
  writeValueWithoutResponse?: (value: BufferSource) => Promise<void>;
  writeValue: (value: BufferSource) => Promise<void>;
}
interface BtService { uuid: string; getCharacteristic(uuid: string): Promise<BtCharacteristic> }
interface BtServer {
  connected: boolean;
  connect(): Promise<BtServer>;
  disconnect(): void;
  getPrimaryServices(): Promise<BtService[]>;
  getPrimaryService(uuid: string): Promise<BtService>;
}
interface BtDevice { id: string; name?: string; gatt?: BtServer; addEventListener(type: string, listener: () => void): void }
interface BtApi { requestDevice(options: unknown): Promise<BtDevice>; requestDevices?(options: unknown): Promise<BtDevice[]>; getDevices?(): Promise<BtDevice[]>; forgetDevice?(id: string): void }

/** A light answered, but its commands are not one we know yet. */
export class UnsupportedLightError extends Error {
  constructor(readonly deviceName: string, readonly knownServices: string[]) {
    super(`Unsupported light: ${deviceName}`);
  }
}

const api = (): BtApi | null => (typeof navigator !== "undefined" ? (navigator as unknown as { bluetooth?: BtApi }).bluetooth ?? null : null);

export const isBluetoothSupported = () => api() !== null && typeof window !== "undefined" && window.isSecureContext;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function withTimeout<T>(job: Promise<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label}: no answer in ${CONNECT_TIMEOUT_MS / 1000}s (out of range or switched off?)`)), CONNECT_TIMEOUT_MS);
    job.then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
  });
}

class BluetoothLink implements LightLink {
  private characteristic: BtCharacteristic | null = null;

  constructor(private readonly device: BtDevice, private readonly profile: LightProfile) {
    device.addEventListener("gattserverdisconnected", () => { this.characteristic = null; });
  }

  async attach(server: BtServer) {
    const service = await server.getPrimaryService(this.profile.service);
    this.characteristic = await service.getCharacteristic(this.profile.characteristic);
  }

  isLive() {
    return this.characteristic !== null && this.device.gatt?.connected === true;
  }

  async connect() {
    const gatt = this.device.gatt;
    if (!gatt) throw new Error("This light has no Bluetooth connection to open");
    try {
      await withTimeout(gatt.connect().then((server) => this.attach(server)), this.device.name || "Light");
    } catch (error) {
      gatt.disconnect();
      throw error;
    }
  }

  disconnect() {
    this.characteristic = null;
    this.device.gatt?.disconnect();
  }

  async write(frames: number[][]) {
    const characteristic = this.characteristic;
    if (!characteristic) throw new Error("Light is not connected");
    for (let i = 0; i < frames.length; i++) {
      const bytes = new Uint8Array(frames[i]);
      if (characteristic.writeValueWithoutResponse) await characteristic.writeValueWithoutResponse(bytes);
      else await characteristic.writeValue(bytes);
      if (i < frames.length - 1) await sleep(FRAME_GAP_MS);
    }
  }
}

type PairedLight = { info: LightInfo; link: LightLink };

async function pairDevice(device: BtDevice, keepOpen: boolean): Promise<PairedLight> {
  const gatt = device.gatt;
  if (!gatt) throw new UnsupportedLightError(device.name || "", []);
  const server = await withTimeout(gatt.connect(), device.name || "Light");
  const offered = (await server.getPrimaryServices()).map((service) => service.uuid);
  const profile = chooseProfile(device.name || "", offered);
  if (!profile) {
    gatt.disconnect();
    throw new UnsupportedLightError(device.name || "", describeOtherServices(offered));
  }
  const link = new BluetoothLink(device, profile);
  if (keepOpen) await link.attach(server);
  else gatt.disconnect(); // a phone holds only a few connections: the hub opens this light again when it is used
  return { info: { id: device.id, name: device.name || profile.label, profileId: profile.id }, link };
}

export interface SavedLight { id: string; name: string; profileId: ProfileId; group?: string }

/**
 * Lights chosen on an earlier visit, given back without scanning or connecting (the hub opens each one when it is first used). Needs the browser /
 * phone app to remember its devices (`getDevices`); with no such call the admin chooses the lights again.
 */
export async function restoreSavedLights(saved: SavedLight[]): Promise<{ info: LightInfo; link: LightLink; group: string }[]> {
  const bluetooth = api();
  if (!bluetooth?.getDevices || !saved.length) return [];
  const devices = await bluetooth.getDevices();
  const byId = new Map(devices.map((device) => [device.id, device]));
  return saved.flatMap((light) => {
    const device = byId.get(light.id);
    const profile = PROFILES[light.profileId];
    return device && profile ? [{ info: { id: light.id, name: light.name, profileId: light.profileId }, link: new BluetoothLink(device, profile) as LightLink, group: light.group || "" }] : [];
  });
}

/** Takes a light off the phone's remembered list (so it is not offered again after it was removed here). */
export function forgetBluetoothLight(id: string) { api()?.forgetDevice?.(id); }

/**
 * Opens the device chooser (several lights can be ticked in the phone app), works out which command set each light speaks and
 * returns the ones that worked. `failed` lists the lights whose commands are not known (or that did not answer).
 * Resolves with no lights when the chooser is closed without picking anything.
 */
export async function pairBluetoothLights(): Promise<{ lights: PairedLight[]; failed: { name: string; error: unknown }[] }> {
  const bluetooth = api();
  if (!bluetooth) throw new Error("Bluetooth is not available in this browser");
  const options = { acceptAllDevices: true, optionalServices: DETECTION_SERVICES };
  let devices: BtDevice[];
  try {
    devices = bluetooth.requestDevices ? await bluetooth.requestDevices(options) : [await bluetooth.requestDevice(options)];
  } catch (error) {
    if ((error as { name?: string }).name === "NotFoundError") return { lights: [], failed: [] };
    throw error;
  }
  const lights: PairedLight[] = [];
  const failed: { name: string; error: unknown }[] = [];
  for (const device of devices) {
    try { lights.push(await pairDevice(device, devices.length === 1)); } catch (error) { failed.push({ name: device.name || "?", error }); }
  }
  return { lights, failed };
}
