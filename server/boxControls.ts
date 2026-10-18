// Remote buttons for the karaoke box (Admin › Requests › Song system controls): the admin presses one, the bridge program at the venue
// takes it from this queue and presses the same button on the box. The box's buttons are plain presses (it cannot tell us whether it is
// muted or paused), so mute and pause are toggles: press again to undo.
export const BOX_CONTROL_COMMANDS = {
  voice: "MuOr",         // the singer's own voice on / off
  musicUp: "Music_up",   // music volume
  musicDown: "Music_down",
  micUp: "Mic_up",       // microphone volume
  micDown: "Mic_down",
  mute: "Mute",          // mute / unmute
  pause: "Play",         // pause / resume the song on now
  repeat: "Reset",       // play the song on now again from the start
  skip: "Skip",          // cut the song on now (a song ordered on the box itself)
} as const;

export type BoxControl = keyof typeof BOX_CONTROL_COMMANDS;

const MAX_PENDING = 20;
const PRESS_EXPIRES_MS = 60_000; // a press nobody collected in a minute is dropped, so it never fires late

export const isBoxControl = (value: unknown): value is BoxControl => typeof value === "string" && Object.prototype.hasOwnProperty.call(BOX_CONTROL_COMMANDS, value);

// A song waiting on the box, picked by the number the box gave it (xH): remove it, or play it next.
export const BOX_SONG_COMMANDS = { remove: "Del1", next: "Pro2" } as const;
export type BoxSongAction = keyof typeof BOX_SONG_COMMANDS;
export const isBoxSongAction = (value: unknown): value is BoxSongAction => typeof value === "string" && Object.prototype.hasOwnProperty.call(BOX_SONG_COMMANDS, value);
export const isBoxSongId = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9_-]{1,20}$/.test(value);

/** What the admin pressed, waiting for the bridge (per company; memory only, gone after a restart). */
export class BoxControlQueue {
  private readonly pending = new Map<string, Array<{ command: string; at: number }>>();

  /** Adds the box command of a control; false when too many are already waiting (the bridge is not collecting them). */
  push(company: string, control: BoxControl, now = Date.now()): boolean {
    const list = (this.pending.get(company) ?? []).filter((press) => now - press.at <= PRESS_EXPIRES_MS);
    if (list.length >= MAX_PENDING) return false;
    list.push({ command: BOX_CONTROL_COMMANDS[control], at: now });
    this.pending.set(company, list);
    return true;
  }

  /** Adds a command for one song of the box's own list: "Del1:<id>" / "Pro2:<id>" (the bridge splits it at the colon). */
  pushSong(company: string, action: BoxSongAction, id: string, now = Date.now()): boolean {
    const list = (this.pending.get(company) ?? []).filter((press) => now - press.at <= PRESS_EXPIRES_MS);
    if (list.length >= MAX_PENDING) return false;
    list.push({ command: `${BOX_SONG_COMMANDS[action]}:${id}`, at: now });
    this.pending.set(company, list);
    return true;
  }

  /** Hands every waiting command to the bridge, once. */
  take(company: string, now = Date.now()): string[] {
    const list = this.pending.get(company) ?? [];
    this.pending.delete(company);
    return list.filter((press) => now - press.at <= PRESS_EXPIRES_MS).map((press) => press.command);
  }
}
