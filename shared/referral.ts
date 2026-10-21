// Referral commission on a paid POS bill: the referrer earns a % of what the member paid for items that are NOT on promotion.
// Left out: items the admin flagged "no referral commission", packages, free units, and any line sold below the item's regular price
// (happy-hour price, a line the cashier discounted). A bill discount (manual, member perk, app order) lowers the base in proportion,
// and so does part of the bill paid with package credit.
const MONEY_STEP = 100;
const round = (value: number) => Math.round(value * MONEY_STEP) / MONEY_STEP;

export interface ReferralLine {
  name: string;
  qty: number;
  price: number;
  lineTotal: number;
  regularPrice: number;
  isReferralOk: boolean;
  isPackage: boolean;
}

export interface ReferralBill {
  subtotal: number;
  discount: number;
  total: number;
  due: number;
  percent: number;
}

export interface ReferralResult {
  base: number;
  amount: number;
  excluded: string[];
}

export const isLineEligible = (line: ReferralLine): boolean =>
  line.isReferralOk && !line.isPackage && line.price > 0 && line.price >= line.regularPrice;

export function referralCommission(lines: ReferralLine[], bill: ReferralBill): ReferralResult {
  const eligible = lines.filter(isLineEligible);
  const excluded = Array.from(new Set(lines.filter((line) => !isLineEligible(line) && line.lineTotal >= 0).map((line) => line.name)));
  const eligibleTotal = eligible.reduce((sum, line) => sum + line.lineTotal, 0);
  const afterDiscount = bill.subtotal > 0 ? eligibleTotal * Math.max(0, bill.subtotal - bill.discount) / bill.subtotal : 0;
  const paidShare = bill.total > 0 ? Math.min(1, Math.max(0, bill.due) / bill.total) : 0;
  const base = round(afterDiscount * paidShare);
  const percent = Math.max(0, Math.min(100, bill.percent));
  return { base, amount: round(base * percent / 100), excluded };
}
