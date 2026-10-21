// Referral commission on POS bills: when a referred member's bill is paid, the person who referred them gets RP credits (a % set by the admin) on the
// items that are not on promotion. The sums are in shared/referral.ts; this file finds the referrer, books the credits and keeps the record on the bill
// so the sales copy of the receipt can show how it was worked out. A refund takes the commission back.
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "./db";
import { commissionHistory, creditHistory, posProducts, posTicketItems, posTickets, referrals, users } from "@shared/schema";
import { referralCommission, type ReferralLine } from "@shared/referral";

const OFF_BILL_STATUSES = ["rejected", "lost"];
const NOTE_MAX_LENGTH = 250;
const POS_ORDER = "pos_order";

export interface ReferralSettings {
  isOn: boolean;
  percent: number;
  /** The house account every un-referred sign-up is linked to: it never earns commission. */
  houseUserId: string;
}

export interface ReferralBillTotals { subtotal: number; discount: number; total: number; due: number }

const nameOf = (user: { firstName?: string | null; lastName?: string | null; username?: string | null; email?: string | null }) =>
  [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || user.email || "";

export async function payReferralCommission(ticketId: number, totals: ReferralBillTotals, settings: ReferralSettings): Promise<{ referrerId: string; amount: number } | null> {
  if (!settings.isOn || settings.percent <= 0 || totals.due <= 0) return null;
  const [ticket] = await db.select().from(posTickets).where(eq(posTickets.id, ticketId));
  if (!ticket?.memberId) return null;
  const [buyer] = await db.select().from(users).where(eq(users.id, ticket.memberId));
  const referrerId = buyer?.referredById;
  if (!buyer || !referrerId || referrerId === buyer.id || referrerId === settings.houseUserId) return null;
  const [referrer] = await db.select().from(users).where(eq(users.id, referrerId));
  if (!referrer) return null;

  const items = (await db.select().from(posTicketItems).where(eq(posTicketItems.orderId, ticketId))).filter((item) => !OFF_BILL_STATUSES.includes(item.status));
  const productIds = Array.from(new Set(items.map((item) => item.productId).filter((id): id is number => !!id)));
  const products = productIds.length ? await db.select().from(posProducts).where(inArray(posProducts.id, productIds)) : [];
  const productById = new Map(products.map((product) => [product.id, product]));
  const lines: ReferralLine[] = items.map((item) => {
    const product = item.productId ? productById.get(item.productId) : undefined;
    return {
      name: item.name, qty: item.qty, price: Number(item.price), lineTotal: Number(item.lineTotal),
      regularPrice: product ? Number(product.price) : Number(item.price),
      isReferralOk: !!product && product.referralOk,
      isPackage: !!product?.packageKind,
    };
  });
  const result = referralCommission(lines, { ...totals, percent: settings.percent });
  const note = result.excluded.join(", ").slice(0, NOTE_MAX_LENGTH);
  const referrerName = nameOf(referrer);

  await db.transaction(async (tx) => {
    await tx.update(posTickets).set({ referralPayee: referrerName, referralBase: String(result.base), referralPercent: String(settings.percent), referralAmount: String(result.amount), referralNote: note || null }).where(eq(posTickets.id, ticketId));
    if (result.amount <= 0) return;
    await tx.update(users).set({ credits: sql`${users.credits} + ${result.amount}`, referralEarnings: sql`${users.referralEarnings} + ${result.amount}` }).where(eq(users.id, referrerId));
    await tx.insert(creditHistory).values({ userId: referrerId, amount: String(result.amount), type: "referral_commission", description: `Referral commission (${settings.percent}%) on ${nameOf(buyer) || "a member"}'s bill ${ticket.orderNo}: RP ${result.base.toLocaleString("en-US")} counted`, referenceId: String(ticketId) });
    await tx.insert(commissionHistory).values({ introducerId: referrerId, referredUserId: buyer.id, transactionAmount: String(result.base), commissionAmount: String(result.amount), commissionRate: String(settings.percent / 100), description: `${settings.percent}% referral commission on bill ${ticket.orderNo}`, relatedId: ticketId, relatedType: POS_ORDER, status: "completed" });
    await tx.update(referrals).set({ totalEarnings: sql`${referrals.totalEarnings} + ${result.amount}` }).where(and(eq(referrals.referrerId, referrerId), eq(referrals.referredId, buyer.id)));
  });
  return result.amount > 0 ? { referrerId, amount: result.amount } : null;
}

/** A refunded bill gives its referral commission back (the credits can't go below 0). */
export async function reverseReferralCommission(ticketId: number): Promise<number> {
  const [ticket] = await db.select().from(posTickets).where(eq(posTickets.id, ticketId));
  const amount = Number(ticket?.referralAmount) || 0;
  if (!ticket || amount <= 0) return 0;
  const [paid] = await db.select().from(commissionHistory).where(and(eq(commissionHistory.relatedId, ticketId), eq(commissionHistory.relatedType, POS_ORDER), eq(commissionHistory.status, "completed")));
  if (!paid) return 0;
  await db.transaction(async (tx) => {
    await tx.update(commissionHistory).set({ status: "reversed" }).where(eq(commissionHistory.id, paid.id));
    await tx.update(users).set({ credits: sql`GREATEST(0, ${users.credits} - ${amount})`, referralEarnings: sql`GREATEST(0, ${users.referralEarnings} - ${amount})` }).where(eq(users.id, paid.introducerId));
    await tx.insert(creditHistory).values({ userId: paid.introducerId, amount: String(-amount), type: "referral_reversal", description: `Referral commission returned (refund of bill ${ticket.orderNo})`, referenceId: String(ticketId) });
    await tx.update(referrals).set({ totalEarnings: sql`GREATEST(0, ${referrals.totalEarnings} - ${amount})` }).where(and(eq(referrals.referrerId, paid.introducerId), eq(referrals.referredId, paid.referredUserId)));
  });
  return amount;
}
