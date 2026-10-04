// POS packages: products the admin marks as a package are sold like any item, and on
// payment they land in the member's inventory (like a kept bottle):
//  - 'uses'   → N visits (e.g. spa ×10); staff take one use at a time.
//  - 'credit' → prepaid credit (e.g. pay 5,000,000 → 10,000,000 credit) that pays only
//               for products the admin allows (`pos_products.credit_ok`). When a credit
//               package is used up the member gets its perk: X% off for N days or for life.
import { and, asc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "./db";
import { memberPackages, memberPackageUses, posProducts } from "@shared/schema";
import { roundMoney } from "./companyMoney";

export type PackageKind = "uses" | "credit";
const DAY_MS = 86_400_000;
const money = (n: unknown) => roundMoney(Number(n) || 0); // whole rupiah, or cents for SGD…

// Not expired: no end date or it is still in the future.
const notExpired = () => or(isNull(memberPackages.expiresAt), gt(memberPackages.expiresAt, new Date()));

// Admin product form → the package columns (null kind = a normal product).
export function packageFields(b: any) {
  const kind = b.packageKind === "uses" || b.packageKind === "credit" ? b.packageKind : null;
  const int = (v: unknown) => (v === "" || v === null || v === undefined || !(Number(v) > 0) ? null : Math.floor(Number(v)));
  return {
    packageKind: kind,
    packageUses: kind === "uses" ? Math.max(1, int(b.packageUses) || 1) : null,
    packageCredit: kind === "credit" ? String(Math.max(0, money(b.packageCredit))) : null,
    packageValidDays: kind ? int(b.packageValidDays) : null,
    perkPercent: kind === "credit" && Number(b.perkPercent) > 0 ? String(Math.min(100, Number(b.perkPercent))) : null,
    perkDays: kind === "credit" ? int(b.perkDays) : null,
    creditOk: kind ? false : b.creditOk !== false, // a package itself is never paid with package credit
  };
}

const perkActive = (p: any, now = Date.now()) => !!p.perkFrom && Number(p.perkPercent) > 0 && p.status !== "refunded" && (!p.perkUntil || new Date(p.perkUntil).getTime() > now);

// Everything a member holds: active packages, total usable credit and their best perk.
export async function memberWallet(userId: string) {
  const rows = await db.select().from(memberPackages).where(eq(memberPackages.userId, userId)).orderBy(asc(memberPackages.expiresAt), asc(memberPackages.id));
  const now = Date.now();
  const live = rows.filter((p) => p.status === "active" && (!p.expiresAt || new Date(p.expiresAt).getTime() > now));
  const perks = rows.filter((p) => perkActive(p, now)).sort((a, b) => Number(b.perkPercent) - Number(a.perkPercent));
  const best = perks[0];
  return {
    packages: live.map((p) => ({
      id: p.id, kind: p.kind, name: p.name, usesTotal: p.usesTotal, usesLeft: p.usesLeft,
      creditTotal: Number(p.creditTotal), creditLeft: Number(p.creditLeft), expiresAt: p.expiresAt,
      perkPercent: Number(p.perkPercent), perkDays: p.perkDays, createdAt: p.createdAt,
    })),
    creditBalance: live.filter((p) => p.kind === "credit").reduce((n, p) => n + Number(p.creditLeft), 0),
    perk: best ? { percent: Number(best.perkPercent), until: best.perkUntil, name: best.name } : null,
  };
}

// The bill with the member's perk and (optionally) their package credit applied.
// `lines` are the bill's items; package products get no perk, and only products the
// admin allows (credit_ok, not a package) can be paid with package credit.
export async function quoteBill(o: {
  lines: { productId?: number | null; lineTotal: number }[]; manualDiscount: number; userId?: string | null;
  usePackageCredit?: boolean; serviceFeePercent: number; taxPercent: number;
}) {
  const ids = Array.from(new Set(o.lines.map((l) => Number(l.productId)).filter(Boolean)));
  const products = ids.length ? await db.select({ id: posProducts.id, packageKind: posProducts.packageKind, creditOk: posProducts.creditOk }).from(posProducts).where(inArray(posProducts.id, ids)) : [];
  const byId = new Map(products.map((p) => [p.id, p]));
  let subtotal = 0, packageBase = 0, creditBase = 0;
  for (const l of o.lines) {
    const amt = Number(l.lineTotal) || 0, p = byId.get(Number(l.productId));
    subtotal = money(subtotal + amt);
    if (p?.packageKind) packageBase += amt;
    else if (p && p.creditOk !== false) creditBase += amt;
  }
  const manualDiscount = Math.min(subtotal, Math.max(0, Number(o.manualDiscount) || 0));
  const wallet = o.userId ? await memberWallet(o.userId) : null;
  const perkPercent = wallet?.perk?.percent || 0;
  const perkAmount = money(Math.max(0, subtotal - packageBase - manualDiscount) * perkPercent / 100);
  const discount = Math.min(subtotal, manualDiscount + perkAmount);
  const taxable = money(subtotal - discount);
  const serviceFee = money(taxable * o.serviceFeePercent / 100);
  const tax = money(taxable * o.taxPercent / 100);
  const total = money(taxable + serviceFee + tax);
  const creditable = subtotal > 0 ? money(total * creditBase / subtotal) : 0;
  const creditBalance = wallet?.creditBalance || 0;
  const creditUse = o.usePackageCredit ? Math.min(creditable, creditBalance) : 0;
  return { subtotal, manualDiscount, perkPercent, perkAmount, discount, serviceFee, tax, total, creditBalance, creditable, creditUse, due: money(total - creditUse), hasPackages: packageBase > 0 };
}

// Spend package credit, oldest-expiring first. Each package is taken with an atomic
// UPDATE, so two tills can never spend the same credit. A package that reaches 0 is
// used up and its perk starts. Returns the amount spent and any perks unlocked.
export async function spendPackageCredit(userId: string, amount: number, ticketId: number, staffId: string) {
  let left = money(amount);
  const perks: { percent: number; until: Date | null; name: string }[] = [];
  if (left <= 0) return { spent: 0, perks };
  const rows = await db.select().from(memberPackages).where(and(eq(memberPackages.userId, userId), eq(memberPackages.kind, "credit"), eq(memberPackages.status, "active"), notExpired(), gt(memberPackages.creditLeft, "0"))).orderBy(sql`${memberPackages.expiresAt} ASC NULLS LAST`, asc(memberPackages.id));
  for (const p of rows) {
    if (left <= 0) break;
    const take = Math.min(left, Number(p.creditLeft));
    const [after] = await db.update(memberPackages).set({ creditLeft: sql`${memberPackages.creditLeft} - ${take}` })
      .where(and(eq(memberPackages.id, p.id), sql`${memberPackages.creditLeft} >= ${take}`, eq(memberPackages.status, "active"))).returning();
    if (!after) continue; // spent elsewhere just now
    left -= take;
    await db.insert(memberPackageUses).values({ packageId: p.id, userId, ticketId, credit: String(take), staffId, note: "Paid with package credit" });
    if (Number(after.creditLeft) <= 0) {
      const now = new Date();
      const perk = Number(after.perkPercent) > 0;
      const until = perk && after.perkDays ? new Date(now.getTime() + after.perkDays * DAY_MS) : null;
      await db.update(memberPackages).set({ status: "used", usedUpAt: now, ...(perk ? { perkFrom: now, perkUntil: until } : {}) }).where(eq(memberPackages.id, p.id));
      if (perk) perks.push({ percent: Number(after.perkPercent), until, name: after.name });
    }
  }
  return { spent: money(amount) - left, perks };
}

// Give back the package credit a bill used (refund, or a payment that failed after it).
// A package that was used up becomes active again and its perk is taken back.
export async function restorePackageCredit(ticketId: number, staffId: string, note: string) {
  const uses = await db.select().from(memberPackageUses).where(eq(memberPackageUses.ticketId, ticketId));
  const byPkg = new Map<number, { userId: string; credit: number }>();
  for (const u of uses) {
    const cur = byPkg.get(u.packageId) || { userId: u.userId, credit: 0 };
    cur.credit += Number(u.credit) || 0;
    byPkg.set(u.packageId, cur);
  }
  let restored = 0;
  for (const [packageId, { userId, credit }] of Array.from(byPkg)) {
    if (credit <= 0) continue;
    await db.update(memberPackages).set({ creditLeft: sql`${memberPackages.creditLeft} + ${credit}`, status: "active", usedUpAt: null, perkFrom: null, perkUntil: null })
      .where(and(eq(memberPackages.id, packageId), sql`${memberPackages.status} <> 'refunded'`));
    await db.insert(memberPackageUses).values({ packageId, userId, ticketId, credit: String(-credit), staffId, note });
    restored += credit;
  }
  return restored;
}

// Packages bought on a paid bill → the member's inventory (one per quantity).
export async function issuePackages(member: { id: string; name: string | null; code: string | null }, ticketId: number, companyId: number | null, items: { productId?: number | null; qty: number; price: number | string }[]) {
  const ids = Array.from(new Set(items.map((i) => Number(i.productId)).filter(Boolean)));
  if (!ids.length) return [];
  const products = await db.select().from(posProducts).where(and(inArray(posProducts.id, ids), sql`${posProducts.packageKind} IS NOT NULL`));
  const byId = new Map(products.map((p) => [p.id, p]));
  const made: any[] = [];
  const now = new Date();
  for (const it of items) {
    const p = byId.get(Number(it.productId));
    if (!p) continue;
    for (let i = 0; i < Math.max(1, Number(it.qty) || 1); i++) {
      const credit = p.packageKind === "credit" ? money(p.packageCredit) : 0;
      const uses = p.packageKind === "uses" ? Math.max(1, p.packageUses || 1) : 0;
      const [row] = await db.insert(memberPackages).values({
        companyId, userId: member.id, memberName: member.name, memberCode: member.code, productId: p.id, ticketId,
        kind: p.packageKind!, name: p.name, usesTotal: uses, usesLeft: uses, creditTotal: String(credit), creditLeft: String(credit),
        pricePaid: String(Number(it.price) || 0), perkPercent: String(Number(p.perkPercent) || 0), perkDays: p.perkDays,
        expiresAt: p.packageValidDays ? new Date(now.getTime() + p.packageValidDays * DAY_MS) : null,
      }).returning();
      made.push(row);
    }
  }
  return made;
}

// A refunded bill: packages bought on it are closed (whatever is left is void).
export async function refundPackagesOfTicket(ticketId: number) {
  return db.update(memberPackages).set({ status: "refunded", usesLeft: 0, creditLeft: "0", perkFrom: null, perkUntil: null })
    .where(eq(memberPackages.ticketId, ticketId)).returning({ id: memberPackages.id });
}

// Take visits from a 'uses' package (atomic; never below 0).
export async function takePackageUses(packageId: number, n: number, staffId: string, ticketId: number | null) {
  const take = Math.max(1, Math.floor(n) || 1);
  const [after] = await db.update(memberPackages).set({ usesLeft: sql`${memberPackages.usesLeft} - ${take}` })
    .where(and(eq(memberPackages.id, packageId), eq(memberPackages.kind, "uses"), eq(memberPackages.status, "active"), notExpired(), sql`${memberPackages.usesLeft} >= ${take}`)).returning();
  if (!after) return null;
  if (after.usesLeft <= 0) await db.update(memberPackages).set({ status: "used", usedUpAt: new Date() }).where(eq(memberPackages.id, packageId));
  await db.insert(memberPackageUses).values({ packageId, userId: after.userId, ticketId, uses: take, staffId, note: "Used at POS" });
  return after;
}

// Staff list / search of active packages (POS › Packages).
export async function listActivePackages(q: string) {
  const rows = await db.select().from(memberPackages).where(and(eq(memberPackages.status, "active"), notExpired())).orderBy(asc(memberPackages.memberName), asc(memberPackages.id)).limit(300);
  const needle = q.trim().toLowerCase();
  return (needle ? rows.filter((r) => [r.memberName, r.memberCode, r.name].some((v) => (v || "").toLowerCase().includes(needle))) : rows)
    .map((p) => ({ ...p, creditTotal: Number(p.creditTotal), creditLeft: Number(p.creditLeft), perkPercent: Number(p.perkPercent) }));
}
