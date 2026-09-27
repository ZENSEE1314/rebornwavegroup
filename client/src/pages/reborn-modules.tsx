import { useEffect, useMemo, useState } from "react";
import { RebornLayout } from "@/components/RebornLayout";
import { useModules, moduleEnabled } from "@/lib/modules";
import {
  request, field, button, Panel,
  PosPanel, TablesPanel, KdsPanel, FoodcourtPanel, BookingPanel, EventsPanel,
  RepairPanel, WholesalePanel, ProjectsPanel, MarketingPanel, GiftsPanel, DrawsPanel,
  PayrollPanel, AccountingPanel, DashboardPanel, AuditPanel, PricingPanel,
} from "@/pages/bridgex-admin";

type Row = Record<string, any>;

// Every business module, embedded in the Reborn app (not the BridgeX console).
// Each tab shows only if the module is enabled for this company (super admin › Services).
export default function RebornModules() {
  const modules = useModules();
  const [companyId, setCompanyId] = useState<number>();
  const [staff, setStaff] = useState<Row[]>([]);
  const [customers, setCustomers] = useState<Row[]>([]);
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState<string>("");

  useEffect(() => {
    fetch(`/api/v1/tenant/resolve?host=${encodeURIComponent(location.hostname)}&slug=${encodeURIComponent((() => { try { return localStorage.getItem("bridgexTenantSlug") || ""; } catch { return ""; } })())}`, { credentials: "include" })
      .then((r) => r.json()).then((t) => setCompanyId(t?.id)).catch(() => {});
  }, []);
  useEffect(() => {
    if (!companyId) return;
    request("/api/v1/company/staff", {}, companyId).then(setStaff).catch(() => {});
    if (moduleEnabled(modules, "crm")) request("/api/v1/company/crm/customers", {}, companyId).then(setCustomers).catch(() => {});
  }, [companyId, modules]);

  const crmOn = moduleEnabled(modules, "crm");
  const pricingOn = moduleEnabled(modules, "pricing");

  // Tab list — gated by enabled modules. Label makes the industry meaning clear.
  const TABS: { key: string; label: string; mod?: string; render: () => JSX.Element }[] = useMemo(() => [
    { key: "dashboard", label: "Dashboard", mod: "analytics", render: () => <DashboardPanel companyId={companyId!} /> },
    { key: "register", label: "POS / Register", mod: "pos", render: () => <PosPanel companyId={companyId!} customers={customers} crmOn={crmOn} pricingOn={pricingOn} onMsg={setMsg} /> },
    { key: "pricing", label: "Pricing / Happy Hour", mod: "pricing", render: () => <PricingPanel companyId={companyId!} onMsg={setMsg} /> },
    { key: "tables", label: "Tables / KTV Rooms", mod: "restaurant", render: () => <TablesPanel companyId={companyId!} onMsg={setMsg} /> },
    { key: "ktv", label: "KTV Rooms", mod: "ktv", render: () => <TablesPanel companyId={companyId!} onMsg={setMsg} /> },
    { key: "kds", label: "Kitchen (KDS)", mod: "kitchen_display", render: () => <KdsPanel companyId={companyId!} onMsg={setMsg} /> },
    { key: "foodcourt", label: "Food Court", mod: "foodcourt", render: () => <FoodcourtPanel companyId={companyId!} onMsg={setMsg} /> },
    { key: "booking", label: "Bookings (Beauty/Spa/Gym…)", mod: "booking", render: () => <BookingPanel companyId={companyId!} staff={staff} customers={customers} onMsg={setMsg} /> },
    { key: "inventory", label: "Inventory", mod: "inventory", render: () => <InlineInventory companyId={companyId!} onMsg={setMsg} /> },
    { key: "crm", label: "Customers (CRM)", mod: "crm", render: () => <InlineCrm companyId={companyId!} onMsg={setMsg} /> },
    { key: "events", label: "Events / Tickets", mod: "events", render: () => <EventsPanel companyId={companyId!} onMsg={setMsg} /> },
    { key: "repair", label: "Repair Shop", mod: "repair", render: () => <RepairPanel companyId={companyId!} staff={staff} onMsg={setMsg} /> },
    { key: "wholesale", label: "Wholesale / B2B", mod: "wholesale", render: () => <WholesalePanel companyId={companyId!} onMsg={setMsg} /> },
    { key: "projects", label: "Projects", mod: "professional", render: () => <ProjectsPanel companyId={companyId!} onMsg={setMsg} /> },
    { key: "marketing", label: "Marketing", mod: "marketing", render: () => <MarketingPanel companyId={companyId!} onMsg={setMsg} /> },
    { key: "gifts", label: "Live Gifts", mod: "live_gifts", render: () => <GiftsPanel companyId={companyId!} staff={staff} onMsg={setMsg} /> },
    { key: "draws", label: "Lucky Draw", mod: "lucky_draw", render: () => <DrawsPanel companyId={companyId!} onMsg={setMsg} /> },
    { key: "payroll", label: "Payroll", mod: "payroll", render: () => <PayrollPanel companyId={companyId!} /> },
    { key: "accounting", label: "Accounting", mod: "accounting", render: () => <AccountingPanel companyId={companyId!} onMsg={setMsg} /> },
    { key: "audit", label: "Audit / Log", mod: "audit", render: () => <AuditPanel companyId={companyId!} /> },
  ], [companyId, customers, staff, crmOn, pricingOn]);

  const visible = TABS.filter((t) => moduleEnabled(modules, t.mod));
  const active = tab && visible.some((t) => t.key === tab) ? tab : visible[0]?.key;

  return (
    <RebornLayout active="/reborn-modules" title="BUSINESS" wide>
      {msg && <div className="mb-3 rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-3 text-sm text-cyan-100">{msg}</div>}
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-2">
        {visible.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm ${active === t.key ? "bg-cyan-400 font-bold text-slate-950" : "bg-white/5 text-white/70"}`}>{t.label}</button>
        ))}
      </div>
      {!companyId ? <p className="text-sm text-white/50">Loading…</p> : (visible.find((t) => t.key === active)?.render() || <p className="text-sm text-white/50">No modules enabled. Enable them in super admin › Services.</p>)}
    </RebornLayout>
  );
}

// Compact Inventory (items + stock + suppliers) using the company API.
function InlineInventory({ companyId, onMsg }: { companyId: number; onMsg: (m: string) => void }) {
  const [items, setItems] = useState<Row[]>([]);
  const [suppliers, setSuppliers] = useState<Row[]>([]);
  const [f, setF] = useState({ name: "", sku: "", unit: "unit", costPrice: "0", sellPrice: "0", lowStockThreshold: "0", supplierId: "" });
  const [sup, setSup] = useState({ name: "", phone: "" });
  const load = () => { request("/api/v1/company/inventory/items", {}, companyId).then(setItems).catch(() => {}); request("/api/v1/company/inventory/suppliers", {}, companyId).then(setSuppliers).catch(() => {}); };
  useEffect(load, [companyId]);
  const act = async (run: () => Promise<any>, m: string) => { try { await run(); onMsg(m); load(); } catch (e: any) { onMsg(e.message); } };
  return <div className="grid gap-5 lg:grid-cols-2">
    <Panel title="Stock items" subtitle="Track quantity on hand; low-stock is flagged.">
      <div className="grid gap-2 sm:grid-cols-2"><input className={field} placeholder="Item" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /><input className={field} placeholder="Unit (bottle, kg)" value={f.unit} onChange={e => setF({ ...f, unit: e.target.value })} /><input className={field} type="number" placeholder="Cost" value={f.costPrice} onChange={e => setF({ ...f, costPrice: e.target.value })} /><input className={field} type="number" placeholder="Sell" value={f.sellPrice} onChange={e => setF({ ...f, sellPrice: e.target.value })} /><input className={field} type="number" placeholder="Low-stock at" value={f.lowStockThreshold} onChange={e => setF({ ...f, lowStockThreshold: e.target.value })} /><select className={field} value={f.supplierId} onChange={e => setF({ ...f, supplierId: e.target.value })}><option value="">No supplier</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
      <button className={button + " mt-3"} disabled={!f.name} onClick={() => act(async () => { await request("/api/v1/company/inventory/items", { method: "POST", body: JSON.stringify(f) }, companyId); setF({ name: "", sku: "", unit: "unit", costPrice: "0", sellPrice: "0", lowStockThreshold: "0", supplierId: "" }); }, "Item added")}>Add item</button>
      <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-slate-500"><tr><th>Item</th><th>Stock</th><th></th></tr></thead><tbody>{items.map(i => <tr key={i.id} className={`border-t border-white/10 ${i.low_stock ? "bg-red-500/10" : ""}`}><td className="py-2">{i.name}</td><td>{Number(i.stock)} {i.unit}{i.low_stock ? " ⚠️" : ""}</td><td><button className="text-xs text-emerald-300" onClick={() => { const q = prompt(`Add stock to ${i.name}`); if (q && Number(q)) act(() => request("/api/v1/company/inventory/adjust", { method: "POST", body: JSON.stringify({ itemId: i.id, quantity: Math.abs(Number(q)), type: "in" }) }, companyId), "Stock updated"); }}>+ in</button> <button className="text-xs text-amber-300" onClick={() => { const q = prompt(`Remove stock from ${i.name}`); if (q && Number(q)) act(() => request("/api/v1/company/inventory/adjust", { method: "POST", body: JSON.stringify({ itemId: i.id, quantity: -Math.abs(Number(q)), type: "out" }) }, companyId), "Stock updated"); }}>− out</button></td></tr>)}</tbody></table></div>
    </Panel>
    <Panel title="Suppliers" subtitle="Vendors you buy stock from.">
      <div className="flex gap-2"><input className={field} placeholder="Supplier" value={sup.name} onChange={e => setSup({ ...sup, name: e.target.value })} /><input className={field} placeholder="Phone" value={sup.phone} onChange={e => setSup({ ...sup, phone: e.target.value })} /><button className={button} disabled={!sup.name} onClick={() => act(async () => { await request("/api/v1/company/inventory/suppliers", { method: "POST", body: JSON.stringify(sup) }, companyId); setSup({ name: "", phone: "" }); }, "Supplier added")}>Add</button></div>
      <div className="mt-3 grid gap-2">{suppliers.map(s => <div key={s.id} className="rounded-xl border border-white/10 bg-white/[.03] p-3 text-sm"><b>{s.name}</b> <span className="text-xs text-slate-400">{s.phone || "—"}</span></div>)}</div>
    </Panel>
  </div>;
}

// Compact CRM (customers + segments) using the company API.
function InlineCrm({ companyId, onMsg }: { companyId: number; onMsg: (m: string) => void }) {
  const [customers, setCustomers] = useState<Row[]>([]);
  const [seg, setSeg] = useState<Row>({});
  const [q, setQ] = useState("");
  const [f, setF] = useState({ name: "", phone: "", email: "" });
  const load = () => { request(`/api/v1/company/crm/customers?q=${encodeURIComponent(q)}`, {}, companyId).then(setCustomers).catch(() => {}); request("/api/v1/company/crm/segments", {}, companyId).then(setSeg).catch(() => {}); };
  useEffect(load, [companyId, q]);
  const act = async (run: () => Promise<any>, m: string) => { try { await run(); onMsg(m); load(); } catch (e: any) { onMsg(e.message); } };
  return <Panel title="Customers & segments" subtitle="Auto-tagged VIP / New / Lost / Birthday.">
    <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-6">{[["total", "All"], ["vip", "VIP"], ["new", "New"], ["active", "Active"], ["lost", "Lost"], ["birthday", "🎂"]].map(([k, l]) => <div key={k} className="rounded-xl border border-white/10 bg-white/[.04] p-2 text-center"><b className="block">{Number(seg[k] || 0)}</b><span className="text-[11px] text-slate-500">{l}</span></div>)}</div>
    <div className="grid gap-2 sm:grid-cols-3"><input className={field} placeholder="Name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /><input className={field} placeholder="Phone" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /><input className={field} placeholder="Email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></div>
    <button className={button + " mt-2"} disabled={!f.name} onClick={() => act(async () => { await request("/api/v1/company/crm/customers", { method: "POST", body: JSON.stringify(f) }, companyId); setF({ name: "", phone: "", email: "" }); }, "Customer added")}>Add customer</button>
    <input className={field + " mt-3"} placeholder="Search customers" value={q} onChange={e => setQ(e.target.value)} />
    <div className="mt-2 grid gap-2">{customers.map(c => <div key={c.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[.03] p-3 text-sm"><div><b>{c.name}</b> {c.is_vip && <span className="text-amber-300">VIP</span>}<p className="text-xs text-slate-400">{c.phone || "—"} · spend {Number(c.total_spend).toLocaleString()} · {c.visit_count} visits</p></div><button className="text-xs text-cyan-300" onClick={() => { const a = prompt(`Record a visit for ${c.name} — amount`); if (a !== null) act(() => request(`/api/v1/company/crm/customers/${c.id}/visit`, { method: "POST", body: JSON.stringify({ amount: Number(a) || 0 }) }, companyId), "Visit recorded"); }}>+ visit</button></div>)}</div>
  </Panel>;
}
