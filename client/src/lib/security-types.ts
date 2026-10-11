export type CameraKind = "image" | "page";
export interface Camera { id: string; name: string; kind: CameraKind; url: string; refreshSeconds: number }
export interface StationNumber { label: string; phone: string }
export interface SecuritySetup { cameras: Camera[]; stationNumbers: StationNumber[]; alertPhones: string[]; canEdit: boolean }
export type OfficerOutcome = "open" | "verified" | "not_verified" | "refused";
export interface OfficerCheck { id: string; at: string; staffName: string; claimedName: string; badge: string; unit: string; note: string; outcome: OfficerOutcome; closedAt?: string; closedBy?: string }

export const errorText = (error: unknown): string => (error instanceof Error ? error.message : String(error)).replace(/^\d{3}:\s*/, "");
export const panelCard = "rounded-2xl bg-white/5 border border-white/10 p-4";
export const panelField = "min-w-0 px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-400/60";
export const panelButton = "inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-lg text-xs font-semibold bg-white/5 text-white/80 border border-white/10 disabled:opacity-40";
export const primaryButton = "inline-flex items-center justify-center gap-1.5 min-h-[44px] px-5 rounded-lg font-bold text-black text-sm bg-amber-400 disabled:opacity-40";
