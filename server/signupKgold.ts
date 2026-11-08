import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import { appSettings, memberWalletTransactions, users } from "@shared/schema";

// Free-start promo: while this setting holds an amount, every new account is given that much KGOLD once.
export const SIGNUP_KGOLD_KEY = "kgoldSignupBonus";
export const FREE_START_TX_TYPE = "free_start";

export function freeStartDescription(amount: number) {
  return `Free start: ${amount.toLocaleString()} KGOLD`;
}

// Never lets a sign-up fail: a problem here only means the new member misses the bonus.
export async function grantSignupKgold(userId: string) {
  try {
    const [row] = await db.select().from(appSettings).where(eq(appSettings.key, SIGNUP_KGOLD_KEY));
    const amount = Math.floor(Number(row?.value) || 0);
    if (amount <= 0) return;
    await db.transaction(async (tx) => {
      await tx.update(users).set({ kgold: sql`${users.kgold} + ${amount}`, updatedAt: new Date() }).where(eq(users.id, userId));
      await tx.insert(memberWalletTransactions).values({ userId, type: FREE_START_TX_TYPE, kgoldAmount: amount, description: freeStartDescription(amount) });
    });
  } catch (error) {
    console.error("signup kgold", error);
  }
}
