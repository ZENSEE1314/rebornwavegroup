// Payslips and the payday reminder: what a payslip holds, its words in en / zh / id, and when the admin is reminded to pay.
export type PayslipLang = "en" | "zh" | "id";

export interface PayslipLine { label: string; amount: number }
export interface PayslipData {
  company: string;
  staffName: string;
  month: string;            // yyyy-mm, the month the pay is for
  paidAt: string;           // ISO time the admin recorded it
  currency: { symbol: string; decimals: number };
  basic: number;
  commission: number;
  overtime: number;
  gross: number;
  /** What the staff member pays towards the funds (CPF, BPJS…), one line each. */
  contributions: PayslipLine[];
  deduction: number;
  deductionNote: string;
  net: number;
}

export const PAYSLIP_TEXT: Record<PayslipLang, Record<string, string>> = {
  en: { title: "PAYSLIP", month: "Pay for", staff: "Staff", earnings: "Earnings", basic: "Basic pay", commission: "Sales commission", overtime: "Overtime", gross: "Gross pay", taken: "Deductions", contributions: "Staff contributions", deduction: "Deduction", net: "NET PAY", paidOn: "Paid on", note: "Keep this payslip for your records." },
  zh: { title: "工资单", month: "工资月份", staff: "员工", earnings: "收入", basic: "基本工资", commission: "销售提成", overtime: "加班费", gross: "应发工资", taken: "扣除", contributions: "员工缴费", deduction: "扣款", net: "实发工资", paidOn: "发放日期", note: "请保留此工资单作记录。" },
  id: { title: "SLIP GAJI", month: "Gaji bulan", staff: "Karyawan", earnings: "Pendapatan", basic: "Gaji pokok", commission: "Komisi penjualan", overtime: "Lembur", gross: "Gaji kotor", taken: "Potongan", contributions: "Iuran karyawan", deduction: "Potongan", net: "GAJI BERSIH", paidOn: "Dibayar pada", note: "Simpan slip gaji ini sebagai arsip." },
};

const MONTH_LOCALE: Record<PayslipLang, string> = { en: "en-US", zh: "zh-CN", id: "id-ID" };

/** "2026-09" written as a month and year in the language. */
export function monthLabel(month: string, lang: PayslipLang): string {
  const [year, mon] = month.split("-").map(Number);
  if (!year || !mon) return month;
  return new Date(Date.UTC(year, mon - 1, 1)).toLocaleDateString(MONTH_LOCALE[lang], { month: "long", year: "numeric", timeZone: "UTC" });
}

/** The month before a date's month: on the 15th of October the payroll to pay is September's. */
export function previousMonth(year: number, month: number): string {
  const y = month === 1 ? year - 1 : year;
  const m = month === 1 ? 12 : month - 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

export const PAYDAY_REMINDER_HOUR = 9; // WIB: the reminder comes in the morning of payday

export interface PayrollClock { year: number; month: number; day: number; hour: number }

/** Whether the reminder is due now: payday has come (or passed in this month), it is morning, and this month's payroll hasn't been reminded yet. */
export function isReminderDue(now: PayrollClock, payday: number, lastRemindedMonth: string | null): boolean {
  const monthToPay = previousMonth(now.year, now.month);
  if (lastRemindedMonth === monthToPay) return false;
  if (now.day < payday) return false;
  return now.day > payday || now.hour >= PAYDAY_REMINDER_HOUR;
}

export const formatAmount = (amount: number, currency: { symbol: string; decimals: number }) =>
  `${currency.symbol} ${amount.toLocaleString("en-US", { minimumFractionDigits: currency.decimals, maximumFractionDigits: currency.decimals })}`;
