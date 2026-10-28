// Live pictures of the venue's cameras, kept in memory only. The camera program on the venue PC (venue/camera-bridge.mjs) sends one small picture now and then;
// the Security tab shows the latest. Nothing is written to the database or to disk, and a picture older than FRAME_MAX_AGE_MS counts as "camera offline".

export const FRAME_MAX_AGE_MS = 30_000;
export const WATCH_WINDOW_MS = 20_000;   // the venue PC sends often only while someone has looked this recently
export const MAX_FRAME_BYTES = 1_500_000;
export const MAX_CAMERAS_PER_COMPANY = 32;
const MAX_NAME = 60;
const ID_FORMAT = /^[A-Za-z0-9_-]{1,40}$/;
const MS_PER_SECOND = 1000;

export interface VenueCameraInfo { id: string; name: string; ageSeconds: number }
interface Frame { name: string; jpeg: Buffer; at: number }

const isJpeg = (bytes: Buffer) => bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8;

export function createVenueCameraStore(now: () => number = Date.now) {
  const frames = new Map<string, Frame>();
  const lastWatched = new Map<string, number>();
  const key = (scope: string, id: string) => `${scope}\u0000${id}`;
  const isFresh = (frame: Frame) => now() - frame.at <= FRAME_MAX_AGE_MS;

  return {
    /** Keeps a picture sent by the venue PC; false when it is not a usable JPEG or the id is not allowed. */
    setFrame(scope: string, id: string, name: string, jpeg: Buffer): boolean {
      if (!ID_FORMAT.test(id) || !isJpeg(jpeg) || jpeg.length > MAX_FRAME_BYTES) return false;
      const count = Array.from(frames.keys()).filter((k) => k.startsWith(`${scope}\u0000`)).length;
      if (!frames.has(key(scope, id)) && count >= MAX_CAMERAS_PER_COMPANY) return false;
      frames.set(key(scope, id), { name: name.trim().slice(0, MAX_NAME) || id, jpeg, at: now() });
      return true;
    },
    getFrame(scope: string, id: string): Buffer | null {
      const frame = frames.get(key(scope, id));
      return frame && isFresh(frame) ? frame.jpeg : null;
    },
    list(scope: string): VenueCameraInfo[] {
      const found: VenueCameraInfo[] = [];
      frames.forEach((frame, k) => {
        if (!k.startsWith(`${scope}\u0000`) || !isFresh(frame)) return;
        found.push({ id: k.slice(scope.length + 1), name: frame.name, ageSeconds: Math.round((now() - frame.at) / MS_PER_SECOND) });
      });
      return found.sort((a, b) => a.name.localeCompare(b.name));
    },
    markWatched(scope: string) { lastWatched.set(scope, now()); },
    isWatched(scope: string): boolean { return now() - (lastWatched.get(scope) ?? -Infinity) <= WATCH_WINDOW_MS; },
  };
}
