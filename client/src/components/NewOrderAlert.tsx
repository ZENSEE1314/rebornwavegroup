import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";
import { ringAlarm, stopAlarm } from "@/lib/staff-alarm";

const PENDING_ORDERS = "/api/reborn/pos/pending-orders";
const STAFF_ORDERS = "/api/reborn/pos/order-alerts";
const POLL_MS = 5000;
const RING_EVERY_MS = 3000;
const VIBRATION = [500, 200, 500, 200, 500];
const IGNORED_KEY = "rw.ignoredOrderAlerts";
const IGNORED_KEPT = 200;

interface PendingOrder { orderId: number; orderNo: string; tableNumber: string | null; memberName: string; at: string; items: { id: number; name: string; qty: number }[] }

interface StaffOrder { id: string; orderNo: string; table: string; byName: string; lines: string[]; at: number }

// The alerts this device was told to ignore (the main POS PC does not need to ring for every order): kept in the browser, so a reload does not bring them back.
function readIgnored(): string[] {
  try { const list = JSON.parse(localStorage.getItem(IGNORED_KEY) || "[]"); return Array.isArray(list) ? list.map(String) : []; } catch { return []; }
}
const pendingKey = (order: PendingOrder) => `order:${order.orderId}:${order.items.map((item) => item.id).sort((a, b) => a - b).join(",")}`; // a new item on the same order rings again
const staffKey = (order: StaffOrder) => `staff:${order.id}`;

// An order waits for the team: every staff phone and admin screen vibrates and beeps until someone taps Accept
// (like a service call). Two kinds: a member's order from the app (the counter accepts its items) and an order a colleague
// entered for a table (the person who entered it is not asked).
export function NewOrderAlert() {
  const { user } = useAuth();
  const role = (user as any)?.role;
  const isStaff = role === "admin" || role === "staff";
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [ignored, setIgnored] = useState<string[]>(readIgnored);
  const ignore = (key: string) => {
    const next = [...ignored, key].slice(-IGNORED_KEPT);
    setIgnored(next);
    try { localStorage.setItem(IGNORED_KEY, JSON.stringify(next)); } catch { /* the choice then lasts until the page is reloaded */ }
  };
  const { data: allOrders = [] } = useQuery<PendingOrder[]>({
    queryKey: [PENDING_ORDERS], queryFn: () => apiRequest("GET", PENDING_ORDERS).then((r) => r.json()), enabled: isStaff, retry: false, refetchInterval: (query) => (query.state.error ? false : POLL_MS),
  });

  const { data: allStaffOrders = [] } = useQuery<StaffOrder[]>({
    queryKey: [STAFF_ORDERS], queryFn: () => apiRequest("GET", STAFF_ORDERS).then((r) => r.json()), enabled: isStaff, retry: false, refetchInterval: (query) => (query.state.error ? false : POLL_MS),
  });

  const orders = allOrders.filter((order) => !ignored.includes(pendingKey(order)));
  const staffOrders = allStaffOrders.filter((order) => !ignored.includes(staffKey(order)));
  const isRinging = isStaff && (orders.length > 0 || staffOrders.length > 0);
  useEffect(() => {
    if (!isRinging) return;
    const ring = () => { ringAlarm(VIBRATION); };
    ring();
    const timer = setInterval(ring, RING_EVERY_MS);
    return () => { clearInterval(timer); stopAlarm(); };
  }, [isRinging]);

  // The order leaves the screen at once so it cannot be tapped twice; the server's list follows.
  const accept = useMutation({
    mutationFn: (order: PendingOrder) => Promise.all(order.items.map((item) => apiRequest("POST", `/api/reborn/pos/items/${item.id}/status`, { status: "accepted" }).then((r) => r.json()))),
    onMutate: (order) => { qc.setQueryData<PendingOrder[]>([PENDING_ORDERS], (old) => (old ?? []).filter((o) => o.orderId !== order.orderId)); },
    onSettled: () => { qc.invalidateQueries({ queryKey: [PENDING_ORDERS] }); qc.invalidateQueries({ queryKey: ["/api/reborn/pos/orders"] }); },
  });

  const acceptStaffOrder = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `${STAFF_ORDERS}/${id}/accept`).then((r) => r.json()),
    onMutate: (id) => { qc.setQueryData<StaffOrder[]>([STAFF_ORDERS], (old) => (old ?? []).filter((o) => o.id !== id)); },
    onSettled: () => { qc.invalidateQueries({ queryKey: [STAFF_ORDERS] }); },
  });

  if (!isStaff || (orders.length === 0 && staffOrders.length === 0)) return null;
  return (
    <div className="fixed inset-x-2 top-20 z-[70] max-h-[50vh] space-y-2 overflow-y-auto" aria-live="assertive">
      {staffOrders.map((order) => (
        <div key={order.id} className="rounded-2xl border border-orange-400/70 bg-orange-950/95 p-3 shadow-2xl backdrop-blur">
          <div className="flex items-center gap-3">
            <BellRing className="h-6 w-6 shrink-0 animate-pulse text-orange-300" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight text-white">{t("hm.order.title", { t: order.table || "-" })}</p>
              <p className="truncate text-[11px] text-white/70">{t("hm.order.by", { n: order.byName })} · {order.orderNo} · {new Date(order.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
            <button onClick={() => ignore(staffKey(order))} className="shrink-0 rounded-xl border border-white/30 bg-white/10 px-3 py-2.5 text-sm font-bold text-white">{t("hm.order.ignore")}</button>
            <button onClick={() => acceptStaffOrder.mutate(order.id)} className="shrink-0 rounded-xl bg-orange-400 px-4 py-2.5 text-sm font-black text-black">{t("hm.order.accept")}</button>
          </div>
          <ul className="mt-2 space-y-0.5 text-xs text-white/90">
            {order.lines.map((line, index) => <li key={index}>{line}</li>)}
          </ul>
        </div>
      ))}
      {orders.map((order) => (
        <div key={order.orderId} className="rounded-2xl border border-orange-400/70 bg-orange-950/95 p-3 shadow-2xl backdrop-blur">
          <div className="flex items-center gap-3">
            <BellRing className="h-6 w-6 shrink-0 animate-pulse text-orange-300" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight text-white">{t("hm.order.title", { t: order.tableNumber || "-" })}</p>
              <p className="truncate text-[11px] text-white/70">{order.memberName || t("hm.order.member")} · {order.orderNo} · {new Date(order.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
            <button onClick={() => ignore(pendingKey(order))} className="shrink-0 rounded-xl border border-white/30 bg-white/10 px-3 py-2.5 text-sm font-bold text-white">{t("hm.order.ignore")}</button>
            <button onClick={() => accept.mutate(order)} className="shrink-0 rounded-xl bg-orange-400 px-4 py-2.5 text-sm font-black text-black">{t("hm.order.accept")}</button>
          </div>
          <ul className="mt-2 space-y-0.5 text-xs text-white/90">
            {order.items.map((item) => <li key={item.id}>{item.qty} × {item.name}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}
