// Bluetooth LED controllers: which service/characteristic each family listens on, and the bytes it expects.
// Brightness is applied by scaling the colour in the app, so no profile needs a separate brightness command.
// The byte layouts come from the community reverse-engineering of these controllers, not from a vendor spec.

export interface Rgb { r: number; g: number; b: number }

export type ProfileId = "elk" | "triones";

export interface LightProfile {
  id: ProfileId;
  label: string;
  service: string;
  characteristic: string;
  /** How many effects the controller has built in (they run on the light itself, no connection needed afterwards). */
  builtInCount: number;
  power(isOn: boolean): number[];
  colour(rgb: Rgb): number[];
  /** Frames that start built-in effect `index` (1-based) at `speed` percent (100 = fastest). */
  builtIn(index: number, speed: number): number[][];
}

const shortUuid = (short: number) => `0000${short.toString(16).padStart(4, "0")}-0000-1000-8000-00805f9b34fb`;
const clampInt = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(value)));
const channel = (value: number) => clampInt(value, 0, 255);
const percent = (value: number) => clampInt(value, 0, 100);

// ELK-BLEDOM family (sold with the "Lotus Lantern" app and many unbranded strips): service 0xFFF0, characteristic 0xFFF3.
const ELK_FIRST_EFFECT = 0x80;
const ELK_EFFECT_COUNT = 29;

const elk: LightProfile = {
  id: "elk",
  label: "ELK-BLEDOM / Lotus Lantern",
  service: shortUuid(0xfff0),
  characteristic: shortUuid(0xfff3),
  builtInCount: ELK_EFFECT_COUNT,
  power: (isOn) => (isOn ? [0x7e, 0x00, 0x04, 0xf0, 0x00, 0x01, 0xff, 0x00, 0xef] : [0x7e, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0x00, 0xef]),
  colour: ({ r, g, b }) => [0x7e, 0x00, 0x05, 0x03, channel(r), channel(g), channel(b), 0x00, 0xef],
  builtIn: (index, speed) => [
    [0x7e, 0x00, 0x02, percent(speed), 0x00, 0x00, 0x00, 0x00, 0xef],
    [0x7e, 0x00, 0x03, ELK_FIRST_EFFECT + clampInt(index, 1, ELK_EFFECT_COUNT) - 1, 0x03, 0x00, 0x00, 0x00, 0xef],
  ],
};

// Triones / HappyLighting / LEDBLE family: service 0xFFD5, characteristic 0xFFD9.
const TRIONES_FIRST_MODE = 0x25;
const TRIONES_MODE_COUNT = 20;
const TRIONES_SLOWEST = 31; // the controller's speed byte counts delay: 1 = fastest, 31 = slowest

const triones: LightProfile = {
  id: "triones",
  label: "Triones / HappyLighting",
  service: shortUuid(0xffd5),
  characteristic: shortUuid(0xffd9),
  builtInCount: TRIONES_MODE_COUNT,
  power: (isOn) => (isOn ? [0xcc, 0x23, 0x33] : [0xcc, 0x24, 0x33]),
  colour: ({ r, g, b }) => [0x56, channel(r), channel(g), channel(b), 0x00, 0xf0, 0xaa],
  builtIn: (index, speed) => [[
    0xbb,
    TRIONES_FIRST_MODE + clampInt(index, 1, TRIONES_MODE_COUNT) - 1,
    clampInt(TRIONES_SLOWEST - (percent(speed) / 100) * (TRIONES_SLOWEST - 1), 1, TRIONES_SLOWEST),
    0x44,
  ]],
};

export const PROFILES: Record<ProfileId, LightProfile> = { elk, triones };
export const PROFILE_LIST: LightProfile[] = [elk, triones];

// Services of other common families. They are only asked for so a light we cannot drive yet can be reported by what it offers.
export const OTHER_KNOWN_SERVICES: Record<string, string> = {
  [shortUuid(0xffe0)]: "FFE0",
  [shortUuid(0xffe5)]: "FFE5",
  [shortUuid(0xffb0)]: "FFB0",
  [shortUuid(0xfee0)]: "FEE0",
  "00010203-0405-0607-0809-0a0b0c0d1910": "Govee",
};

export function detectProfile(serviceUuids: string[]): LightProfile | null {
  const offered = new Set(serviceUuids.map((uuid) => uuid.toLowerCase()));
  return PROFILE_LIST.find((profile) => offered.has(profile.service)) ?? null;
}

export function describeOtherServices(serviceUuids: string[]): string[] {
  return serviceUuids.map((uuid) => OTHER_KNOWN_SERVICES[uuid.toLowerCase()]).filter((label): label is string => !!label);
}

export const DETECTION_SERVICES: string[] = [...PROFILE_LIST.map((profile) => profile.service), ...Object.keys(OTHER_KNOWN_SERVICES)];
