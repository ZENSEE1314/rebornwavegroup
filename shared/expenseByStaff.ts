export interface StaffExpenseRow { status: string; amount: string | number; uploadedBy: string | null; uploadedByName: string | null }
export interface StaffSpend { staffId: string; name: string; count: number; total: number }

/** What each staff member uploaded as expenses in the month (voided uploads left out), biggest spender first. */
export function spendByStaff(rows: StaffExpenseRow[]): StaffSpend[] {
  const byStaff = new Map<string, StaffSpend>();
  for (const row of rows) {
    if (row.status !== "active") continue;
    const staffId = row.uploadedBy || "";
    const spend = byStaff.get(staffId) ?? { staffId, name: row.uploadedByName || "", count: 0, total: 0 };
    spend.count += 1;
    spend.total += Number(row.amount) || 0;
    if (!spend.name && row.uploadedByName) spend.name = row.uploadedByName;
    byStaff.set(staffId, spend);
  }
  return Array.from(byStaff.values()).sort((a, b) => b.total - a.total);
}
