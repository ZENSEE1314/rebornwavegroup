// Payslips: one is saved when the admin records a month's pay (Admin › Payroll › Record paid). The staff member reads / downloads it in the app
// (Profile › My employment) and gets a notification + an e-mail copy; the admin can download it from the payroll row. Also the payday reminder:
// on the payday set in Admin › Settings the admins are told how many staff are still unpaid for the month that just ended.
import type { Express, Request, Response } from "express";
import PDFDocument from "pdfkit";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "./db";
import { appSettings, bridgeCompanyMembers, users } from "@shared/schema";
import { registerCjk } from "./contractPdf";
import { tr, asLang, type Lang } from "./i18n";
import { sendEmailDetailed } from "./emailService";
import { PAYSLIP_TEXT, formatAmount, isReminderDue, monthLabel, previousMonth, type PayrollClock, type PayslipData, type PayslipLang } from "@shared/payslip";

type Handler = (req: Request, res: Response) => Promise<unknown>;
type Wrap = (handler: Handler) => (req: Request, res: Response) => unknown;

export interface PayslipDeps {
  requireStaff: Wrap;
  requireAdmin: Wrap;
  userId(req: Request): string;
  companyId(req?: Request): Promise<number>;
  userLang(userId: string): Promise<Lang>;
  notifyUser(userId: string, text: Record<PayslipLang, string>, data?: Record<string, unknown>): Promise<unknown>;
  notifyAdmins(text: Record<PayslipLang, string>): Promise<unknown>;
  payrollDay(): Promise<number>;
}

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const REMINDED_KEY = "payrollRemindedFor";
const MONTH_FORMAT = /^\d{4}-\d{2}$/;
const rowsOf = (result: any): any[] => (result.rows || result) as any[];
const toLang = (value: unknown): PayslipLang => asLang(value) as PayslipLang;

/** The PDF: labels in the staff member's language (English when the server has no Chinese font). */
export function renderPayslipPdf(data: PayslipData, wanted: PayslipLang): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 56 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    const hasCjk = wanted === "zh" ? registerCjk(doc) : false;
    const lang: PayslipLang = wanted === "zh" && !hasCjk ? "en" : wanted;
    const text = PAYSLIP_TEXT[lang];
    const regular = hasCjk ? "cjk" : "Helvetica";
    const bold = hasCjk ? "cjk" : "Helvetica-Bold";
    const money = (amount: number) => formatAmount(amount, data.currency);
    const left = 56, right = 539;
    const line = (label: string, amount: number, strong = false) => {
      const y = doc.y;
      doc.font(strong ? bold : regular).fontSize(strong ? 12 : 11).text(label, left, y, { width: 300 });
      doc.text(money(amount), left + 300, y, { width: right - left - 300, align: "right" });
      doc.moveDown(0.5);
    };
    doc.font(bold).fontSize(18).text(data.company, { align: "center" });
    doc.font(bold).fontSize(14).text(text.title, { align: "center" }).moveDown(1);
    doc.font(regular).fontSize(11).text(`${text.staff}: ${data.staffName}`);
    doc.text(`${text.month}: ${monthLabel(data.month, lang)}`).moveDown(1);
    doc.font(bold).fontSize(11).text(text.earnings).moveDown(0.3);
    line(text.basic, data.basic);
    if (data.commission > 0) line(text.commission, data.commission);
    if (data.overtime > 0) line(text.overtime, data.overtime);
    line(text.gross, data.gross, true);
    doc.moveDown(0.6).font(bold).fontSize(11).text(text.taken, left).moveDown(0.3);
    for (const entry of data.contributions) line(entry.label, -entry.amount);
    if (data.deduction > 0) line(data.deductionNote ? `${text.deduction} (${data.deductionNote})` : text.deduction, -data.deduction);
    doc.moveTo(left, doc.y).lineTo(right, doc.y).stroke().moveDown(0.5);
    line(text.net, data.net, true);
    doc.moveDown(1).font(regular).fontSize(10).text(`${text.paidOn}: ${data.paidAt.slice(0, 10)}`).moveDown(0.5).text(text.note);
    doc.end();
  });
}

/** Saves the payslip of one person for one month (recording the same month again replaces it) and tells the staff member. */
export async function savePayslip(deps: PayslipDeps, companyId: number, userId: string, data: PayslipData, staffEmail: string | null): Promise<void> {
  await db.execute(sql`INSERT INTO payslips (company_id, user_id, month, data) VALUES (${companyId}, ${userId}, ${data.month}, ${JSON.stringify(data)})
    ON CONFLICT (company_id, user_id, month) DO UPDATE SET data = EXCLUDED.data, created_at = now()`);
  const label = (lang: PayslipLang) => monthLabel(data.month, lang);
  void deps.notifyUser(userId, {
    en: `💵 Your payslip for ${label("en")} is ready. Open Profile › My employment.`,
    zh: `💵 您 ${label("zh")} 的工资单已生成。请打开 我的 › 我的雇佣。`,
    id: `💵 Slip gaji ${label("id")} Anda sudah siap. Buka Profil › Pekerjaan saya.`,
  }, { month: data.month }).catch(() => {});
  if (staffEmail) {
    const lang = toLang(await deps.userLang(userId));
    const pdf = await renderPayslipPdf(data, lang);
    const subject = `${PAYSLIP_TEXT[lang].title} ${data.month} — ${data.company}`;
    await sendEmailDetailed({ to: staffEmail, subject, text: `${PAYSLIP_TEXT[lang].title}: ${monthLabel(data.month, lang)}`, html: `<p>${PAYSLIP_TEXT[lang].title}: ${monthLabel(data.month, lang)}</p>`, attachments: [{ filename: `payslip-${data.month}.pdf`, content: pdf, contentType: "application/pdf" }] }).catch(() => {});
  }
}

async function loadPayslip(companyId: number, userId: string, month: string): Promise<PayslipData | null> {
  if (!MONTH_FORMAT.test(month)) return null;
  const [row] = rowsOf(await db.execute(sql`SELECT data FROM payslips WHERE company_id=${companyId} AND user_id=${userId} AND month=${month}`));
  try { return row ? JSON.parse(row.data) as PayslipData : null; } catch { return null; }
}

function sendPdf(res: Response, pdf: Buffer, name: string) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${name.replace(/[^\w.-]+/g, "_")}.pdf"`);
  res.send(pdf);
}

export function registerPayslipRoutes(app: Express, deps: PayslipDeps) {
  const notFound = (req: Request, res: Response) => res.status(404).json({ message: tr(req, { en: "No payslip for that month yet", zh: "该月份尚无工资单", id: "Belum ada slip gaji untuk bulan itu" }) });

  app.get("/api/reborn/my-payslips", deps.requireStaff(async (req, res) => {
    const cid = await deps.companyId(req);
    const list = rowsOf(await db.execute(sql`SELECT month, data FROM payslips WHERE company_id=${cid} AND user_id=${deps.userId(req)} ORDER BY month DESC LIMIT 36`));
    res.json(list.map((row) => { const data = JSON.parse(row.data) as PayslipData; return { month: row.month, gross: data.gross, net: data.net, paidAt: data.paidAt, currency: data.currency }; }));
  }));
  app.get("/api/reborn/my-payslips/:month/pdf", deps.requireStaff(async (req, res) => {
    const data = await loadPayslip(await deps.companyId(req), deps.userId(req), String(req.params.month));
    if (!data) return notFound(req, res);
    sendPdf(res, await renderPayslipPdf(data, toLang(await deps.userLang(deps.userId(req)))), `payslip-${data.month}`);
  }));
  app.get("/api/reborn/admin/payslips/:userId/:month/pdf", deps.requireAdmin(async (req, res) => {
    const userId = String(req.params.userId);
    const data = await loadPayslip(await deps.companyId(req), userId, String(req.params.month));
    if (!data) return notFound(req, res);
    sendPdf(res, await renderPayslipPdf(data, toLang(await deps.userLang(userId))), `payslip-${data.staffName}-${data.month}`);
  }));
}

const wibClock = (now = new Date()): PayrollClock => {
  const wib = new Date(now.getTime() + WIB_OFFSET_MS);
  return { year: wib.getUTCFullYear(), month: wib.getUTCMonth() + 1, day: wib.getUTCDate(), hour: wib.getUTCHours() };
};

/** Run hourly in every company's data space: on payday (set in Admin › Settings), tell the admins who is still unpaid for last month. Once per month. */
export async function runPayrollReminder(deps: PayslipDeps, now = new Date()): Promise<boolean> {
  const clock = wibClock(now);
  const monthToPay = previousMonth(clock.year, clock.month);
  const [marker] = await db.select().from(appSettings).where(eq(appSettings.key, REMINDED_KEY));
  if (!isReminderDue(clock, await deps.payrollDay(), marker?.value ?? null)) return false;
  const cid = await deps.companyId();
  const team = await db.select({ id: bridgeCompanyMembers.userId }).from(bridgeCompanyMembers)
    .innerJoin(users, eq(users.id, bridgeCompanyMembers.userId))
    .where(and(eq(bridgeCompanyMembers.companyId, cid), inArray(bridgeCompanyMembers.role, ["owner", "admin", "manager", "staff"]), inArray(users.role, ["admin", "staff"])));
  const paid = new Set(rowsOf(await db.execute(sql`SELECT user_id FROM ledger_entries WHERE ref_type='payroll' AND ref_id LIKE ${`%:${monthToPay}`}`)).map((row) => row.user_id));
  const unpaid = team.filter((member) => !paid.has(member.id)).length;
  await db.insert(appSettings).values({ key: REMINDED_KEY, value: monthToPay, updatedAt: new Date() }).onConflictDoUpdate({ target: appSettings.key, set: { value: monthToPay, updatedAt: new Date() } });
  if (unpaid === 0) return false;
  const label = (lang: PayslipLang) => monthLabel(monthToPay, lang);
  await deps.notifyAdmins({
    en: `💰 Payday: ${unpaid} staff still need to be paid for ${label("en")}. Open Admin › Payroll, check the month and press Record paid.`,
    zh: `💰 发薪日：还有 ${unpaid} 位员工未发放 ${label("zh")} 的工资。请打开 管理 › 薪资，核对月份后按“记录已付”。`,
    id: `💰 Hari gajian: ${unpaid} staf belum dibayar untuk ${label("id")}. Buka Admin › Penggajian, cek bulannya lalu tekan Catat dibayar.`,
  });
  return true;
}
