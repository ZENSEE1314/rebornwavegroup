// Web Bluetooth connection to real lights (Chrome on Android and desktop; not iPhone, not Android's in-app web view).
// Every light is chosen by the admin once per visit in the browser's own device chooser; the hub then reconnects them as needed.
import type { LightInfo, LightLink } from "./hub";
import { DETECTION_SERVICES, chooseProfile, describeOtherServices, type LightProfile } from "./protocols";

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
interface BtApi { requestDevice(options: unknown): Promise<BtDevice> }

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

/**
 * Opens the browser's device chooser, connects the light that was picked and works out which command set it speaks.
 * Resolves null when the chooser is closed without picking anything.
 */
export async function pairBluetoothLight(): Promise<{ info: LightInfo; link: LightLink } | null> {
  const bluetooth = api();
  if (!bluetooth) throw new Error("Bluetooth is not available in this browser");
  let device: BtDevice;
  try {
    device = await bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: DETECTION_SERVICES });
  } catch (error) {
    if ((error as { name?: string }).name === "NotFoundError") return null;
    throw error;
  }
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
  await link.attach(server);
  return { info: { id: device.id, name: device.name || profile.label, profileId: profile.id }, link };
}
