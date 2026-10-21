// Accounting reports for a period (a month, or everything): money in from sales, and the costs grouped the way the owner thinks about them —
// stock bought, staff, electricity, water, internet, rent, security, police, commission, refunds and the rest. Built from the ledger; an expense
// uploaded in Admin › Expenses is counted under the kind it was uploaded as (electricity, water ...), and a voided one is taken out again.
export const COST_SECTIONS = ["stock", "stockLoss", "staff", "commission", "security", "police", "electricity", "water", "internet", "utilities", "rent", "refunds", "other"] as const;
export type CostSection = (typeof COST_SECTIONS)[number];

/** The four kinds of cost the owner reads the books by: the goods sold, the people, the utilities, and the company's own expenses. */
export const EXPENSE_GROUPS = ["items", "staff", "utilities", "company"] as const;
export type ExpenseGroup = (typeof EXPENSE_GROUPS)[number];

export interface LedgerLine { id: number; kind: string; category: string; amount: number | string; refType?: string | null; refId?: string | null; createdAt: Date | string | null }
export interface UploadRef { id: number; ledgerEntryId: number | null; category: string }

export interface PeriodReport {
  income: number;
  incomeByCategory: Record<string, number>;
  costs: Record<CostSection, number>;
  costTotal: number;
  /** The same costs added up by the four groups. */
  groups: Record<ExpenseGroup, number>;
  /** Money in minus the stock bought. */
  grossProfit: number;
  /** Money in minus every cost. */
  net: number;
}

const CENTS = 100;
const round = (value: number) => Math.round(value * CENTS) / CENTS;
const JAKARTA_OFFSET_MS = 7 * 3_600_000;

const SECTION_OF: Record<string, CostSection> = {
  purchase: "stock",
  salary: "staff", statutory_contribution: "staff",
  commission: "commission",
  electricity: "electricity", water: "water", internet: "internet", utilities: "utilities",
  rent: "rent", rental: "rent",
  security: "security", police: "police",
  refund: "refunds",
  loss: "stockLoss",
};

export const GROUP_OF_SECTION: Record<CostSection, ExpenseGroup> = {
  stock: "items", stockLoss: "items",
  staff: "staff", commission: "staff", security: "staff", police: "staff",
  electricity: "utilities", water: "utilities", internet: "utilities", utilities: "utilities",
  rent: "company", refunds: "company", other: "company",
};

export const sectionsOfGroup = (group: ExpenseGroup): CostSection[] => COST_SECTIONS.filter((section) => GROUP_OF_SECTION[section] === group);

export const sectionOf = (label: string): CostSection => SECTION_OF[label] ?? "other";

/** "2026-10" of a ledger line, on the venue's clock (UTC+7: receipts are booked at 12:00 of their day there). */
export const monthOfLine = (createdAt: Date | string | null): string => new Date(new Date(createdAt ?? 0).getTime() + JAKARTA_OFFSET_MS).toISOString().slice(0, 7);

const emptyCosts = (): Record<CostSection, number> => Object.fromEntries(COST_SECTIONS.map((section) => [section, 0])) as Record<CostSection, number>;

export type ReportGroup = "income" | CostSection;

/** Where a ledger line is counted and by how much (a reversal counts negatively in the group it reverses). Used by the totals and by the drill-down, so they always agree. */
export function classifyLine(
  line: LedgerLine,
  uploads: UploadRef[],
  uploadByLedger: Map<number, UploadRef> = new Map(uploads.filter((upload) => upload.ledgerEntryId !== null).map((upload) => [upload.ledgerEntryId as number, upload])),
  uploadById: Map<string, UploadRef> = new Map(uploads.map((upload) => [String(upload.id), upload])),
): { group: ReportGroup; amount: number } {
  const amount = Number(line.amount) || 0;
  if (line.kind === "expense") {
    const label = line.refType === "expense_upload" ? uploadByLedger.get(line.id)?.category ?? line.category : line.category;
    return { group: sectionOf(label), amount };
  }
  if (line.category === "expense_reversal") return { group: sectionOf(uploadById.get(String(line.refId))?.category ?? "other"), amount: -amount };
  if (line.category === "commission_reversal") return { group: "commission", amount: -amount };
  return { group: "income", amount };
}

export function periodReport(lines: LedgerLine[], uploads: UploadRef[]): PeriodReport {
  const uploadByLedger = new Map(uploads.filter((upload) => upload.ledgerEntryId !== null).map((upload) => [upload.ledgerEntryId as number, upload]));
  const uploadById = new Map(uploads.map((upload) => [String(upload.id), upload]));
  const costs = emptyCosts();
  const incomeByCategory: Record<string, number> = {};
  let income = 0;
  for (const line of lines) {
    const { group, amount } = classifyLine(line, uploads, uploadByLedger, uploadById);
    if (group === "income") {
      income += amount;
      incomeByCategory[line.category] = (incomeByCategory[line.category] || 0) + amount;
    } else {
      costs[group] += amount;
    }
  }
  const costTotal = COST_SECTIONS.reduce((sum, section) => sum + costs[section], 0);
  for (const section of COST_SECTIONS) costs[section] = round(costs[section]);
  const groups = Object.fromEntries(EXPENSE_GROUPS.map((group) => [group, round(sectionsOfGroup(group).reduce((sum, section) => sum + costs[section], 0))])) as Record<ExpenseGroup, number>;
  return { income: round(income), incomeByCategory, costs, costTotal: round(costTotal), groups, grossProfit: round(income - costs.stock), net: round(income - costTotal) };
}

/** One report per month that has any line, newest first. */
export function monthlyReports(lines: LedgerLine[], uploads: UploadRef[]): { month: string; report: PeriodReport }[] {
  const byMonth = new Map<string, LedgerLine[]>();
  for (const line of lines) {
    if (!line.createdAt) continue; // a line with no date cannot be put in a month
    const month = monthOfLine(line.createdAt);
    byMonth.set(month, [...(byMonth.get(month) || []), line]);
  }
  return Array.from(byMonth.entries()).sort((a, b) => b[0].localeCompare(a[0])).map(([month, rows]) => ({ month, report: periodReport(rows, uploads) }));
}
