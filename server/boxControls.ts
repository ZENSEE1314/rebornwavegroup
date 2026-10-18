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
} as const;

export type BoxControl = keyof typeof BOX_CONTROL_COMMANDS;

const MAX_PENDING = 20;

export const isBoxControl = (value: unknown): value is BoxControl => typeof value === "string" && Object.prototype.hasOwnProperty.call(BOX_CONTROL_COMMANDS, value);

/** What the admin pressed, waiting for the bridge (per company; memory only, gone after a restart). */
export class BoxControlQueue {
  private readonly pending = new Map<string, string[]>();

  /** Adds the box command of a control; false when too many are already waiting (the bridge is not collecting them). */
  push(company: string, control: BoxControl): boolean {
    const list = this.pending.get(company) ?? [];
    if (list.length >= MAX_PENDING) return false;
    list.push(BOX_CONTROL_COMMANDS[control]);
    this.pending.set(company, list);
    return true;
  }

  /** Hands every waiting command to the bridge, once. */
  take(company: string): string[] {
    const list = this.pending.get(company) ?? [];
    this.pending.delete(company);
    return list;
  }
}
