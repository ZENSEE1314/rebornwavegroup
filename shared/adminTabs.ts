// The buttons (tabs) of the Reborn admin page, per kind of account. The main admin can narrow what one person sees (below).
export const STAFF_TABS = ["Overview", "Bookings", "Requests", "Redemptions", "Bottles", "Top-ups", "Pet", "Songs", "Games", "Events", "Staff", "Leaderboard", "Feedback", "Security", "POS"] as const;
// Managers: the staff tabs + users, products, inventory, Expenses and Daily sales. The QR codes tab comes second, as for the main admin.
export const MANAGER_TABS = ["Overview", "QR", ...STAFF_TABS.slice(1, -1), "Users", "Products", "Inventory", "Expenses", "Sales", "POS"] as const;
export const ADMIN_TABS = ["Overview", "QR", "Bookings", "Requests", "Redemptions", "Bottles", "Top-ups", "Pet", "Songs", "Games", "Events", "Broadcast", "CRM", "Users", "Staff", "Payroll", "Leaderboard", "Feedback", "Products", "Inventory", "Accounting", "Expenses", "Prizes", "Gifts", "FAQ", "Features", "Lights", "Security", "Settings", "Logs", "Errors", "Sales", "POS"] as const;

/** Tabs staff do not have until the main admin switches them on for that person (the accounts staff upload the day's expenses here). */
export const OPT_IN_TABS = ["Expenses"] as const;

export type AdminRole = "admin" | "manager" | "staff" | "user";
export const ALWAYS_VISIBLE_TAB = "Overview";

export const tabsForRole = (role: AdminRole): readonly string[] => (role === "admin" ? ADMIN_TABS : role === "manager" ? MANAGER_TABS : STAFF_TABS);

const optedInTabs = (role: AdminRole, list: readonly string[] | null | undefined): string[] =>
  role === "staff" && list ? OPT_IN_TABS.filter((tab) => list.includes(tab)) : [];

/** What an account sees: its kind's tabs, narrowed to the list the main admin set for it (no list = all of them). Overview is always there. */
export function visibleTabs(role: AdminRole, allowed: readonly string[] | null | undefined): string[] {
  const base = tabsForRole(role);
  const shown = allowed ? base.filter((tab) => tab === ALWAYS_VISIBLE_TAB || allowed.includes(tab)) : [...base];
  const extra = optedInTabs(role, allowed);
  if (!extra.length) return shown;
  const posAt = shown.indexOf("POS"); // POS stays at the end
  return posAt < 0 ? [...shown, ...extra] : [...shown.slice(0, posAt), ...extra, ...shown.slice(posAt)];
}

/** A list from the screen, reduced to tabs this kind of account has; null (or the whole set) means "no limit". */
export function cleanTabAccess(raw: unknown, role: AdminRole): string[] | null {
  if (!Array.isArray(raw)) return null;
  const base = tabsForRole(role);
  const chosen = base.filter((tab) => tab === ALWAYS_VISIBLE_TAB || raw.includes(tab));
  const extra = optedInTabs(role, raw);
  return chosen.length === base.length && !extra.length ? null : [...chosen, ...extra];
}

/** Whether an account may use the Expenses screen (and its routes): managers and the main admin always, staff only when it was switched on for them. */
export function canUseExpenses(role: AdminRole, allowed: readonly string[] | null | undefined): boolean {
  return role === "admin" || role === "manager" || (role === "staff" && !!allowed?.includes("Expenses"));
}
