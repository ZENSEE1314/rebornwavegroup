export interface StaffExpenseRow {
  id: number;
  status: string;
  amount: string | number;
  uploadedBy: string | null;
  uploadedByName: string | null;
  spentOn: string;
  payee?: string | null;
  category: string;
  payMethod?: string | null;
  items?: { name: string; qty: number; unitCost: number }[];
  /** The bill is on credit terms and still waiting to be paid. */
  bill?: { status: string } | null;
}
export interface StaffReceipt { id: number; spentOn: string; payee: string; category: string; amount: number; isPaid: boolean; payMethod: string; items: { name: string; qty: number; unitCost: number }[] }
export interface StaffSpend { staffId: string; name: string; count: number; total: number; paid: number; unpaid: number; receipts: StaffReceipt[] }

/** What each staff member uploaded as expenses in the month (voided uploads left out): the total, how much of it is paid and how much still owed, and every receipt. Biggest spender first. */
export function spendByStaff(rows: StaffExpenseRow[]): StaffSpend[] {
  const byStaff = new Map<string, StaffSpend>();
  for (const row of rows) {
    if (row.status !== "active") continue;
    const staffId = row.uploadedBy || "";
    const spend = byStaff.get(staffId) ?? { staffId, name: row.uploadedByName || "", count: 0, total: 0, paid: 0, unpaid: 0, receipts: [] };
    const amount = Number(row.amount) || 0;
    const isPaid = row.bill?.status !== "unpaid";
    spend.count += 1;
    spend.total += amount;
    if (isPaid) spend.paid += amount; else spend.unpaid += amount;
    if (!spend.name && row.uploadedByName) spend.name = row.uploadedByName;
    spend.receipts.push({ id: row.id, spentOn: row.spentOn, payee: row.payee || "", category: row.category, amount, isPaid, payMethod: row.payMethod || "", items: row.items || [] });
    byStaff.set(staffId, spend);
  }
  return Array.from(byStaff.values()).map((spend) => ({ ...spend, receipts: spend.receipts.sort((a, b) => b.spentOn.localeCompare(a.spentOn) || b.id - a.id) })).sort((a, b) => b.total - a.total);
}
