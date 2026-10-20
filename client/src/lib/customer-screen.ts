// The customer-facing screen (/customer, on the monitor that faces the customer): the POS tells it what is on the bill, it shows the bill and, when nothing is
// being rung up, the event posters. The two windows share one browser, so a BroadcastChannel carries the messages (localStorage is the fallback for a browser without it).

import { useEffect } from "react";

export interface BillLine { name: string; qty: number; total: number }
export interface BillSnapshot {
  table?: string;
  member?: string;
  lines: BillLine[];
  subtotal: number;
  discount: number;
  serviceFee: number;
  tax: number;
  total: number;
}
export type ScreenMessage = { type: "bill"; bill: BillSnapshot } | { type: "idle" } | { type: "thanks"; total: number };

const CHANNEL = "rw-customer-screen";

export function publishScreen(message: ScreenMessage) {
  try {
    const channel = new BroadcastChannel(CHANNEL);
    channel.postMessage(message);
    channel.close();
  } catch { /* no BroadcastChannel: the storage event below carries it */ }
  try { localStorage.setItem(CHANNEL, JSON.stringify({ message, at: Date.now() })); } catch { /* storage blocked: the screen keeps showing the posters */ }
}

export function listenScreen(onMessage: (message: ScreenMessage) => void): () => void {
  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (event) => onMessage(event.data as ScreenMessage);
  } catch { /* fall back to the storage event */ }
  const onStorage = (event: StorageEvent) => {
    if (event.key !== CHANNEL || !event.newValue) return;
    try { onMessage(JSON.parse(event.newValue).message as ScreenMessage); } catch { /* not ours */ }
  };
  window.addEventListener("storage", onStorage);
  return () => { channel?.close(); window.removeEventListener("storage", onStorage); };
}

/** Keeps the customer screen showing this bill; taking the bill off the POS screen puts the posters back. */
export function useMirrorBill(bill: BillSnapshot | null) {
  const key = bill ? JSON.stringify(bill) : "";
  useEffect(() => { if (key) publishScreen({ type: "bill", bill: JSON.parse(key) }); }, [key]);
  useEffect(() => () => publishScreen({ type: "idle" }), []);
}
