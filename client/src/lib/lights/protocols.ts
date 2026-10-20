// Bluetooth LED controllers: which service/characteristic each family listens on, and the bytes it expects.
// Brightness is applied by scaling the colour in the app, so no profile needs a separate brightness command.
//
// Sources: the duoCo-app layout (style 1) was captured from the app's own Bluetooth traffic
// (joshspicer.com/bluetooth-low-energy-home-assistant); the other layouts and the music commands come from the
// community Home Assistant integration github.com/dave-code-ruiz/elkbledom (models.json, elkbledom.py).
// None of it has been run against real lights by us — the admin screen has a "Test" button for that.

export interface Rgb { r: number; g: number; b: number }

export type ProfileId = "elk1" | "elk2" | "elk3" | "ledble" | "ledDash" | "leddmx" | "triones";

export interface MusicSupport {
  /** Number of music modes the controller's own microphone offers. */
  modeCount: number;
  enable(isOn: boolean): number[];
  mode(index: number): number[];
  sensitivity(percent: number): number[];
}

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
  /** Present when the controller has a microphone and a music mode. */
  music?: MusicSupport;
}

const shortUuid = (short: number) => `0000${short.toString(16).padStart(4, "0")}-0000-1000-8000-00805f9b34fb`;
const clampInt = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(value)));
const channel = (value: number) => clampInt(value, 0, 255);
const percent = (value: number) => clampInt(value, 0, 100);

// The ELK-BLEDOM family (sold with the duoCo, LED LAMP and Lotus Lantern apps): service 0xFFF0, characteristic 0xFFF3.
// Controllers share the 0x7E … 0xEF frame but differ in a few bytes depending on firmware, hence three "styles".
const ELK_SERVICE = shortUuid(0xfff0);
const ELK_CHARACTERISTIC = shortUuid(0xfff3);
const ELK_FIRST_EFFECT = 0x87; // 0x87 … 0x9c: jump, crossfade and blink effects
const ELK_EFFECT_COUNT = 22;
const ELK_FIRST_MUSIC_MODE = 0x80; // 0x80 … 0x87
const ELK_MUSIC_MODES = 8;
const ELK_STYLE3_MAX_SPEED = 183;

const elkEffect = (index: number) => ELK_FIRST_EFFECT + clampInt(index, 1, ELK_EFFECT_COUNT) - 1;

const elkMusic: MusicSupport = {
  modeCount: ELK_MUSIC_MODES,
  enable: (isOn) => [0x7e, 0x04, 0x07, isOn ? 0x01 : 0x00, 0xff, 0xff, 0xff, 0x00, 0xef],
  mode: (index) => [0x7e, 0x05, 0x03, ELK_FIRST_MUSIC_MODE + clampInt(index, 1, ELK_MUSIC_MODES) - 1, 0x04, 0xff, 0xff, 0x00, 0xef],
  sensitivity: (value) => [0x7e, 0x04, 0x06, percent(value), 0xff, 0xff, 0xff, 0x00, 0xef],
};

const elk1: LightProfile = {
  id: "elk1",
  label: "ELK-BLEDOM · style 1 (duoCo, newer)",
  service: ELK_SERVICE,
  characteristic: ELK_CHARACTERISTIC,
  builtInCount: ELK_EFFECT_COUNT,
  power: (isOn) => (isOn ? [0x7e, 0x04, 0x04, 0xf0, 0x00, 0x01, 0xff, 0x00, 0xef] : [0x7e, 0x04, 0x04, 0x00, 0x00, 0x00, 0xff, 0x00, 0xef]),
  colour: ({ r, g, b }) => [0x7e, 0x07, 0x05, 0x03, channel(r), channel(g), channel(b), 0x10, 0xef],
  builtIn: (index, speed) => [
    [0x7e, 0x07, 0x02, percent(speed), 0x00, 0x00, 0x00, 0x00, 0xef],
    [0x7e, 0x05, 0x03, elkEffect(index), 0x03, 0xff, 0xff, 0x00, 0xef],
  ],
  music: elkMusic,
};

const elk2: LightProfile = {
  id: "elk2",
  label: "ELK-BLEDOM · style 2 (older)",
  service: ELK_SERVICE,
  characteristic: ELK_CHARACTERISTIC,
  builtInCount: ELK_EFFECT_COUNT,
  power: (isOn) => (isOn ? [0x7e, 0x00, 0x04, 0xf0, 0x00, 0x01, 0xff, 0x00, 0xef] : [0x7e, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0x00, 0xef]),
  colour: ({ r, g, b }) => [0x7e, 0x00, 0x05, 0x03, channel(r), channel(g), channel(b), 0x00, 0xef],
  builtIn: (index, speed) => [
    [0x7e, 0x00, 0x02, percent(speed), 0x00, 0x00, 0x00, 0x00, 0xef],
    [0x7e, 0x00, 0x03, elkEffect(index), 0x03, 0x00, 0x00, 0x00, 0xef],
  ],
  music: elkMusic,
};

const elk3: LightProfile = {
  id: "elk3",
  label: "ELK-BLEDOB · style 3",
  service: ELK_SERVICE,
  characteristic: ELK_CHARACTERISTIC,
  builtInCount: ELK_EFFECT_COUNT,
  power: (isOn) => (isOn ? [0x7e, 0x07, 0x04, 0xff, 0x00, 0x01, 0x02, 0x01, 0xef] : [0x7e, 0x07, 0x04, 0x00, 0x00, 0x00, 0x02, 0x01, 0xef]),
  colour: ({ r, g, b }) => [0x7e, 0x07, 0x05, 0x03, channel(r), channel(g), channel(b), 0x10, 0xef],
  builtIn: (index, speed) => [
    [0x7e, 0x07, 0x02, clampInt((percent(speed) / 100) * ELK_STYLE3_MAX_SPEED, 0, ELK_STYLE3_MAX_SPEED), 0x00, 0x00, 0x00, 0x00, 0xef],
    [0x7e, 0x07, 0x03, elkEffect(index), 0x03, 0xff, 0xff, 0x00, 0xef],
  ],
  music: elkMusic,
};

// "LED LAMP"-style strips named LEDBLE-… and LED-… / JACKYLED-…: service 0xFFE0, characteristic 0xFFE1.
const LEDBLE_SERVICE = shortUuid(0xffe0);
const LEDBLE_CHARACTERISTIC = shortUuid(0xffe1);

const ledble: LightProfile = {
  id: "ledble",
  label: "LEDBLE",
  service: LEDBLE_SERVICE,
  characteristic: LEDBLE_CHARACTERISTIC,
  builtInCount: ELK_EFFECT_COUNT,
  power: (isOn) => (isOn ? [0x7e, 0x00, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0xef] : [0x7e, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0x00, 0xef]),
  colour: ({ r, g, b }) => [0x7e, 0x00, 0x05, 0x03, channel(r), channel(g), channel(b), 0x00, 0xef],
  builtIn: (index, speed) => [
    [0x7e, 0x00, 0x02, percent(speed), 0x00, 0x00, 0x00, 0x00, 0xef],
    [0x7e, 0x00, 0x03, elkEffect(index), 0x03, 0x00, 0x00, 0x00, 0xef],
  ],
};

const ledDash: LightProfile = {
  id: "ledDash",
  label: "LED- / JACKYLED",
  service: LEDBLE_SERVICE,
  characteristic: LEDBLE_CHARACTERISTIC,
  builtInCount: ELK_EFFECT_COUNT,
  power: (isOn) => (isOn ? [0x7e, 0x04, 0x04, 0x01, 0xff, 0xff, 0xff, 0x00, 0xef] : [0x7e, 0x04, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0xef]),
  // These controllers expect the channels in red, blue, green order.
  colour: ({ r, g, b }) => [0x7e, 0x07, 0x05, 0x03, channel(r), channel(b), channel(g), 0x00, 0xef],
  builtIn: (index, speed) => [
    [0x7e, 0x00, 0x02, percent(speed), 0x00, 0x00, 0x00, 0x00, 0xef],
    [0x7e, 0x05, 0x03, elkEffect(index), 0x03, 0xff, 0xff, 0x00, 0xef],
  ],
};

// LEDDMX-03 controllers (named LEDDMX-03-XXXX, sold with the "LED LAMP" app): service 0xFFE0, characteristic 0xFFE1, 9-byte frames 0x7B 0xFF … 0xBF, written without response.
// Sources: github.com/PUMPKIN97-svg/leddmx-ble-homeassistant (frames taken from LED LAMP, confirmed on an LEDDMX-03) and github.com/kRystalDevv/leddmx-web-controller (colour frame).
const LEDDMX_EFFECT_COUNT = 100; // the controller has 210 effects; the first 100 are offered

const leddmx: LightProfile = {
  id: "leddmx",
  label: "LEDDMX (LED LAMP)",
  service: LEDBLE_SERVICE,
  characteristic: LEDBLE_CHARACTERISTIC,
  builtInCount: LEDDMX_EFFECT_COUNT,
  power: (isOn) => [0x7b, 0xff, 0x04, isOn ? 0x01 : 0x00, 0xff, 0xff, 0xff, 0xff, 0xbf],
  colour: ({ r, g, b }) => [0x7b, 0xff, 0x07, channel(r), channel(g), channel(b), 0x00, 0xff, 0xbf],
  builtIn: (index, speed) => [
    [0x7b, 0xff, 0x02, clampInt(speed, 1, 100), 0xff, 0x00, 0xff, 0xff, 0xbf],
    [0x7b, 0xff, 0x03, clampInt(index, 1, LEDDMX_EFFECT_COUNT), 0xff, 0xff, 0xff, 0xff, 0xbf],
  ],
};

// Triones / HappyLighting family: service 0xFFD5, characteristic 0xFFD9.
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

export const PROFILES: Record<ProfileId, LightProfile> = { elk1, elk2, elk3, ledble, ledDash, leddmx, triones };
export const PROFILE_LIST: LightProfile[] = [elk1, elk2, elk3, ledble, ledDash, leddmx, triones];

// Services of other common families. They are only asked for so a light we cannot drive yet can be reported by what it offers.
export const OTHER_KNOWN_SERVICES: Record<string, string> = {
  [shortUuid(0xffe5)]: "FFE5",
  [shortUuid(0xffb0)]: "FFB0",
  [shortUuid(0xfee0)]: "FEE0",
  "00010203-0405-0607-0809-0a0b0c0d1910": "Govee",
};

/** Picks the command style for a light from the services it offers and the name it advertises. */
export function chooseProfile(deviceName: string, serviceUuids: string[]): LightProfile | null {
  const offered = new Set(serviceUuids.map((uuid) => uuid.toLowerCase()));
  const name = deviceName.toLowerCase();
  if (offered.has(ELK_SERVICE)) {
    if (/^elk-bledob|^elk-bledom0e/.test(name)) return elk3;
    if (/^elk-bledom/.test(name)) return elk1;
    if (/^elk-(ble|bulb|lampl|btc)/.test(name)) return elk2;
    return elk1;
  }
  if (offered.has(LEDBLE_SERVICE)) return /^leddmx/.test(name) ? leddmx : /^(led-|jackyled)/.test(name) ? ledDash : ledble;
  if (offered.has(PROFILES.triones.service)) return triones;
  return null;
}

/** Styles a light can be switched between without reconnecting: the ones that talk on the same characteristic. */
export function stylesSharingConnection(profile: LightProfile): LightProfile[] {
  return PROFILE_LIST.filter((other) => other.service === profile.service && other.characteristic === profile.characteristic);
}

export function describeOtherServices(serviceUuids: string[]): string[] {
  return serviceUuids.map((uuid) => OTHER_KNOWN_SERVICES[uuid.toLowerCase()]).filter((label): label is string => !!label);
}

export const DETECTION_SERVICES: string[] = Array.from(new Set([...PROFILE_LIST.map((profile) => profile.service), ...Object.keys(OTHER_KNOWN_SERVICES)]));

/** A light saved with an older guess (LEDBLE / LED-) whose name says LEDDMX is moved to its own command style. */
export function profileForSaved(name: string, profileId: ProfileId): ProfileId {
  return /^leddmx/i.test(name) && (profileId === "ledble" || profileId === "ledDash") ? "leddmx" : profileId;
}
