// Staff employment contracts. Flow: the staff member uploads their ID in the app (app › Profile › My employment) → the admin writes the
// letter from the payroll profile with the role they set (Admin › Payroll › Contract) → the staff member reads it and signs → the admin
// approves → the PDF is e-mailed to the staff member and the approving admin. The ID photo and the signature are kept in the company's own
// database and are only returned to the person themself and to an admin.
import type { Express, Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { staffContracts } from "@shared/schema";
import { asContractLang, buildContractText, type ContractFields, type ContractLang, type ContractText } from "@shared/staffContract";
import { renderContractPdf } from "./contractPdf";
import { tr, pick, userLang, type Tri } from "./i18n";
import { sendEmailDetailed } from "./emailService";

type Handler = (req: Request, res: Response) => Promise<unknown>;
type Wrap = (handler: Handler) => (req: Request, res: Response) => unknown;

export interface StaffProfileInfo {
  name: string; email: string | null; employmentType: string; payType: string; baseSalary: number; hourlyRate: number;
  commissionRate: number; deposit: number; depositNote: string;
}
export interface StaffContractDeps {
  requireStaff: Wrap;
  requireAdmin: Wrap;
  userId(req: Request): string;
  companyId(req: Request): Promise<number>;
  companyName(): Promise<string>;
  profile(userId: string): Promise<StaffProfileInfo | null>;
  money(amount: number): string;
  notifyUser(userId: string, type: string, text: Tri, data?: Record<string, unknown>): Promise<unknown>;
  notifyAdmins(type: string, text: Tri, data?: Record<string, unknown>): Promise<unknown>;
  adminEmail(req: Request): Promise<string | null>;
  adminName(req: Request): Promise<string>;
  log(req: Request, entry: { targetUserId: string; action: string; description: string }): Promise<unknown>;
}

const MAX_ID_CHARS = 3_000_000;       // a ~2 MB photo as base64
const MAX_SIGNATURE_CHARS = 400_000;
const IMAGE_URL = /^data:image\/(?:png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/;

const LABELS: Record<ContractLang, { signedBy: string; date: string; approvedBy: string; notSigned: string }> = {
  en: { signedBy: "Employee signature", date: "Date", approvedBy: "Approved for the Company", notSigned: "Not signed yet" },
  zh: { signedBy: "员工签名", date: "日期", approvedBy: "公司批准", notSigned: "尚未签名" },
  id: { signedBy: "Tanda tangan Karyawan", date: "Tanggal", approvedBy: "Disetujui untuk Perusahaan", notSigned: "Belum ditandatangani" },
};

const parseText = (json: string | null | undefined): ContractText | null => { try { return json ? JSON.parse(json) as ContractText : null; } catch { return null; } };

type Row = typeof staffContracts.$inferSelect;

function summary(row: Row | undefined) {
  if (!row) return { status: "none" as const, hasId: false };
  return {
    status: row.status, hasId: !!row.idImage, idUploadedAt: row.idUploadedAt, idNumber: row.idNumber || "", lang: row.lang, jobTitle: row.jobTitle || "",
    startDate: row.startDate || "", extraTerms: row.extraTerms || "", text: parseText(row.terms), signedAt: row.signedAt, signedName: row.signedName || "",
    approvedAt: row.approvedAt, returnNote: row.returnNote || "", emailedAt: row.emailedAt,
  };
}

export function registerStaffContractRoutes(app: Express, deps: StaffContractDeps) {
  const find = async (cid: number, userId: string): Promise<Row | undefined> =>
    (await db.select().from(staffContracts).where(and(eq(staffContracts.companyId, cid), eq(staffContracts.userId, userId))).limit(1))[0];

  async function fieldsFor(userId: string, input: { jobTitle: string; startDate: string; extraTerms: string; idNumber: string }): Promise<ContractFields | null> {
    const p = await deps.profile(userId);
    if (!p) return null;
    return {
      company: await deps.companyName(), staffName: p.name, jobTitle: input.jobTitle, employmentType: p.employmentType, startDate: input.startDate,
      payType: p.payType, baseSalary: deps.money(p.baseSalary), hourlyRate: deps.money(p.hourlyRate), commissionRate: p.commissionRate,
      deposit: p.deposit > 0 ? deps.money(p.deposit) : "", depositNote: p.depositNote, extraTerms: input.extraTerms, idNumber: input.idNumber,
    };
  }

  async function pdfOf(row: Row): Promise<Buffer | null> {
    const text = parseText(row.terms);
    if (!text) return null;
    const lang = asContractLang(row.lang);
    const approver = row.approvedBy ? await deps.profile(row.approvedBy) : null;
    return renderContractPdf({
      lang, text, labels: LABELS[lang],
      signature: row.signedAt ? { image: row.signature, name: row.signedName || "", at: row.signedAt } : null,
      approval: row.approvedAt ? { name: approver?.name || "", at: row.approvedAt } : null,
    });
  }

  const sendPdf = (res: Response, pdf: Buffer, name: string) => {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${name.replace(/[^\w.-]+/g, "_")}.pdf"`);
    res.send(pdf);
  };

  // ── The staff member ──────────────────────────────────────────────────────────────────────
  app.get("/api/reborn/my-employment", deps.requireStaff(async (req, res) => {
    const cid = await deps.companyId(req);
    res.json(summary(await find(cid, deps.userId(req))));
  }));

  app.post("/api/reborn/my-employment/id", deps.requireStaff(async (req, res) => {
    const image = String(req.body?.image || "");
    const idNumber = String(req.body?.idNumber || "").trim().slice(0, 60);
    if (!IMAGE_URL.test(image) || image.length > MAX_ID_CHARS) return res.status(400).json({ message: tr(req, { en: "Please upload a clear photo of your ID (a smaller picture if it is too big).", zh: "请上传清晰的证件照片（太大请缩小）。", id: "Unggah foto ID yang jelas (perkecil jika terlalu besar)." }) });
    const cid = await deps.companyId(req); const userId = deps.userId(req);
    const existing = await find(cid, userId);
    const now = new Date();
    if (existing) await db.update(staffContracts).set({ idImage: image, idNumber: idNumber || existing.idNumber, idUploadedAt: now, updatedAt: now }).where(eq(staffContracts.id, existing.id));
    else await db.insert(staffContracts).values({ companyId: cid, userId, status: "none", idImage: image, idNumber, idUploadedAt: now });
    const me = await deps.profile(userId);
    void deps.notifyAdmins("staff_id_uploaded", { en: `🪪 ${me?.name || "A staff member"} uploaded their ID.`, zh: `🪪 ${me?.name || "一位员工"} 已上传证件。`, id: `🪪 ${me?.name || "Seorang staf"} mengunggah ID.` }, { userId }).catch(() => {});
    res.json({ message: tr(req, { en: "ID uploaded", zh: "证件已上传", id: "ID diunggah" }) });
  }));

  app.post("/api/reborn/my-employment/sign", deps.requireStaff(async (req, res) => {
    const cid = await deps.companyId(req); const userId = deps.userId(req);
    const row = await find(cid, userId);
    const signature = String(req.body?.signature || "");
    const name = String(req.body?.name || "").trim().slice(0, 120);
    if (!row || row.status !== "awaiting_staff" || !row.terms) return res.status(409).json({ message: tr(req, { en: "There is no contract waiting for your signature.", zh: "没有等待您签名的合同。", id: "Tidak ada kontrak yang menunggu tanda tangan Anda." }) });
    if (!row.idImage) return res.status(409).json({ message: tr(req, { en: "Upload your ID first.", zh: "请先上传您的证件。", id: "Unggah ID Anda terlebih dahulu." }) });
    if (!name || !IMAGE_URL.test(signature) || signature.length > MAX_SIGNATURE_CHARS) return res.status(400).json({ message: tr(req, { en: "Please type your full name and draw your signature.", zh: "请输入全名并手写签名。", id: "Ketik nama lengkap dan gambar tanda tangan Anda." }) });
    const now = new Date();
    await db.update(staffContracts).set({ signature, signedName: name, signedAt: now, status: "awaiting_approval", returnNote: null, updatedAt: now }).where(eq(staffContracts.id, row.id));
    void deps.notifyAdmins("staff_contract_signed", { en: `✍️ ${name} signed the employment contract — waiting for your approval (Admin › Payroll).`, zh: `✍️ ${name} 已签署雇佣合同——等待您批准（管理 › 薪资）。`, id: `✍️ ${name} menandatangani kontrak kerja — menunggu persetujuan Anda (Admin › Gaji).` }, { userId }).catch(() => {});
    res.json({ message: tr(req, { en: "Signed. The admin will approve it soon.", zh: "已签名，管理员将尽快批准。", id: "Ditandatangani. Admin akan segera menyetujui." }) });
  }));

  app.get("/api/reborn/my-employment/pdf", deps.requireStaff(async (req, res) => {
    const row = await find(await deps.companyId(req), deps.userId(req));
    if (!row || row.status !== "approved") return res.status(404).json({ message: tr(req, { en: "The contract is not approved yet.", zh: "合同尚未批准。", id: "Kontrak belum disetujui." }) });
    const pdf = await pdfOf(row);
    if (!pdf) return res.status(404).json({ message: "No contract" });
    sendPdf(res, pdf, "employment-contract");
  }));

  // ── The admin ───────────────────────────────────────────────────────────────────────────
  // One line per person with a contract record, for the badges in Admin › Payroll.
  app.get("/api/reborn/admin/contracts", deps.requireAdmin(async (req, res) => {
    const rows = await db.select().from(staffContracts).where(eq(staffContracts.companyId, await deps.companyId(req)));
    res.json(rows.map((r) => ({ userId: r.userId, status: r.status, hasId: !!r.idImage })));
  }));

  app.get("/api/reborn/admin/contracts/:userId", deps.requireAdmin(async (req, res) => {
    res.json(summary(await find(await deps.companyId(req), String(req.params.userId))));
  }));

  app.get("/api/reborn/admin/contracts/:userId/id", deps.requireAdmin(async (req, res) => {
    const row = await find(await deps.companyId(req), String(req.params.userId));
    if (!row?.idImage) return res.status(404).json({ message: tr(req, { en: "No ID uploaded yet", zh: "尚未上传证件", id: "Belum ada ID diunggah" }) });
    res.setHeader("Cache-Control", "no-store");
    res.json({ image: row.idImage, idNumber: row.idNumber || "", uploadedAt: row.idUploadedAt });
  }));

  // Write the letter from the payroll profile and the role the admin set, and send it to the staff member to sign.
  app.post("/api/reborn/admin/contracts/:userId/send", deps.requireAdmin(async (req, res) => {
    const cid = await deps.companyId(req); const userId = String(req.params.userId);
    const jobTitle = String(req.body?.jobTitle || "").trim().slice(0, 120);
    const startDate = /^\d{4}-\d{2}-\d{2}$/.test(String(req.body?.startDate || "")) ? String(req.body.startDate) : "";
    const extraTerms = String(req.body?.extraTerms || "").slice(0, 4000);
    const lang = asContractLang(req.body?.lang);
    if (!jobTitle) return res.status(400).json({ message: tr(req, { en: "Set the role (job title) first.", zh: "请先填写职位。", id: "Isi jabatan terlebih dahulu." }) });
    const existing = await find(cid, userId);
    if (existing?.status === "approved") return res.status(409).json({ message: tr(req, { en: "This contract is already approved.", zh: "该合同已批准。", id: "Kontrak ini sudah disetujui." }) });
    const fields = await fieldsFor(userId, { jobTitle, startDate, extraTerms, idNumber: existing?.idNumber || "" });
    if (!fields) return res.status(404).json({ message: tr(req, { en: "Staff member not found", zh: "找不到该员工", id: "Staf tidak ditemukan" }) });
    const text = JSON.stringify(buildContractText(lang, fields));
    const now = new Date();
    const patch = { status: "awaiting_staff", lang, jobTitle, startDate, extraTerms, terms: text, signature: null, signedName: null, signedAt: null, returnNote: null, updatedAt: now };
    if (existing) await db.update(staffContracts).set(patch).where(eq(staffContracts.id, existing.id));
    else await db.insert(staffContracts).values({ companyId: cid, userId, ...patch });
    void deps.notifyUser(userId, "staff_contract", { en: "📄 Your employment contract is ready. Open Profile › My employment to read and sign it.", zh: "📄 您的雇佣合同已准备好。请打开 我的 › 我的雇佣 阅读并签名。", id: "📄 Kontrak kerja Anda sudah siap. Buka Profil › Pekerjaan saya untuk membaca dan menandatangani." }).catch(() => {});
    await deps.log(req, { targetUserId: userId, action: "send_contract", description: `Employment contract sent to ${fields.staffName} as ${jobTitle}` });
    res.json({ message: tr(req, { en: "Contract sent to the staff member to sign.", zh: "合同已发给员工签名。", id: "Kontrak dikirim ke staf untuk ditandatangani." }) });
  }));

  // Send it back to the staff member (wrong details): they see the note and sign again.
  app.post("/api/reborn/admin/contracts/:userId/return", deps.requireAdmin(async (req, res) => {
    const cid = await deps.companyId(req); const userId = String(req.params.userId);
    const row = await find(cid, userId);
    if (!row || row.status !== "awaiting_approval") return res.status(409).json({ message: tr(req, { en: "Nothing to send back.", zh: "没有可退回的内容。", id: "Tidak ada yang bisa dikembalikan." }) });
    const note = String(req.body?.note || "").trim().slice(0, 500);
    await db.update(staffContracts).set({ status: "awaiting_staff", returnNote: note || null, signature: null, signedName: null, signedAt: null, updatedAt: new Date() }).where(eq(staffContracts.id, row.id));
    void deps.notifyUser(userId, "staff_contract", { en: "📄 Your contract was sent back for a change. Open Profile › My employment.", zh: "📄 您的合同被退回修改。请打开 我的 › 我的雇佣。", id: "📄 Kontrak Anda dikembalikan untuk diperbaiki. Buka Profil › Pekerjaan saya." }).catch(() => {});
    res.json({ message: tr(req, { en: "Sent back to the staff member.", zh: "已退回给员工。", id: "Dikembalikan ke staf." }) });
  }));

  async function emailPdf(req: Request, row: Row): Promise<{ staff: boolean; admin: boolean }> {
    const pdf = await pdfOf(row);
    const out = { staff: false, admin: false };
    if (!pdf) return out;
    const staff = await deps.profile(row.userId);
    const adminTo = await deps.adminEmail(req);
    const lang = asContractLang(row.lang);
    const company = await deps.companyName();
    const subject = pick(lang, { en: "Your employment contract — {company}", zh: "您的雇佣合同 — {company}", id: "Kontrak kerja Anda — {company}" }, { company });
    const body = pick(lang, { en: "Dear {name},\n\nYour employment contract with {company} is approved. The signed contract is attached as a PDF.", zh: "{name} 您好，\n\n您与 {company} 的雇佣合同已获批准，已签署的合同见附件 PDF。", id: "Yth. {name},\n\nKontrak kerja Anda dengan {company} telah disetujui. Kontrak yang sudah ditandatangani terlampir dalam PDF." }, { name: staff?.name || "", company });
    const html = `<div style="font-family:Arial,sans-serif;max-width:560px">${body.split("\n").map((l) => `<p>${l.replace(/[<>&]/g, "")}</p>`).join("")}</div>`;
    const attachments = [{ filename: "employment-contract.pdf", content: pdf, contentType: "application/pdf" }];
    if (staff?.email) out.staff = (await sendEmailDetailed({ to: staff.email, subject, text: body, html, attachments })).ok;
    if (adminTo) out.admin = (await sendEmailDetailed({ to: adminTo, subject: `${subject} (${staff?.name || ""})`, text: body, html, attachments })).ok;
    if (out.staff || out.admin) await db.update(staffContracts).set({ emailedAt: new Date() }).where(eq(staffContracts.id, row.id));
    return out;
  }

  app.post("/api/reborn/admin/contracts/:userId/approve", deps.requireAdmin(async (req, res) => {
    const cid = await deps.companyId(req); const userId = String(req.params.userId);
    const row = await find(cid, userId);
    if (!row || row.status !== "awaiting_approval") return res.status(409).json({ message: tr(req, { en: "This contract is not waiting for approval.", zh: "该合同不在待批准状态。", id: "Kontrak ini tidak menunggu persetujuan." }) });
    const now = new Date();
    await db.update(staffContracts).set({ status: "approved", approvedBy: deps.userId(req), approvedAt: now, updatedAt: now }).where(eq(staffContracts.id, row.id));
    const fresh = (await find(cid, userId))!;
    const emailed = await emailPdf(req, fresh);
    void deps.notifyUser(userId, "staff_contract", { en: "✅ Your employment contract is approved. The PDF was sent to your email.", zh: "✅ 您的雇佣合同已批准，PDF 已发送到您的邮箱。", id: "✅ Kontrak kerja Anda disetujui. PDF dikirim ke email Anda." }).catch(() => {});
    await deps.log(req, { targetUserId: userId, action: "approve_contract", description: `Employment contract approved by ${await deps.adminName(req)}` });
    res.json({ emailed, message: tr(req, { en: "Contract approved.", zh: "合同已批准。", id: "Kontrak disetujui." }) });
  }));

  app.post("/api/reborn/admin/contracts/:userId/email", deps.requireAdmin(async (req, res) => {
    const row = await find(await deps.companyId(req), String(req.params.userId));
    if (!row || row.status !== "approved") return res.status(409).json({ message: tr(req, { en: "Only an approved contract is e-mailed.", zh: "只有已批准的合同才会发送邮件。", id: "Hanya kontrak yang disetujui yang dikirim lewat email." }) });
    res.json({ emailed: await emailPdf(req, row) });
  }));

  app.get("/api/reborn/admin/contracts/:userId/pdf", deps.requireAdmin(async (req, res) => {
    const row = await find(await deps.companyId(req), String(req.params.userId));
    const pdf = row ? await pdfOf(row) : null;
    if (!pdf) return res.status(404).json({ message: tr(req, { en: "No contract yet", zh: "还没有合同", id: "Belum ada kontrak" }) });
    sendPdf(res, pdf, "employment-contract");
  }));
}
