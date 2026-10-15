// The employment contract as a PDF (pdfkit). Latin text uses the built-in Helvetica; 中文 needs a CJK font, looked up on the server
// (the Dockerfile installs fonts-wqy-zenhei). With no CJK font the PDF is written in English instead of printing empty boxes.
import PDFDocument from "pdfkit";
import { existsSync } from "node:fs";
import type { ContractLang, ContractText } from "@shared/staffContract";

const CJK_FONTS = [
  process.env.CONTRACT_CJK_FONT || "",
  "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
  "/usr/share/fonts/wqy-zenhei/wqy-zenhei.ttc",
  "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
  "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc",
].filter(Boolean);

export const cjkFontPath = (): string | null => CJK_FONTS.find((p) => existsSync(p)) || null;

// A .ttc holds several fonts: pdfkit needs the PostScript name of the one to use.
const TTC_NAMES = ["WenQuanYiZenHei", "NotoSansCJKsc-Regular", "NotoSansCJKjp-Regular"];
function registerCjk(doc: InstanceType<typeof PDFDocument>): boolean {
  const path = cjkFontPath();
  if (!path) return false;
  for (const name of path.endsWith(".ttc") ? TTC_NAMES : [undefined]) {
    try { doc.registerFont("cjk", path, name as string); doc.font("cjk"); return true; } catch { /* try the next name */ }
  }
  return false;
}

export interface ContractPdfInput {
  lang: ContractLang;
  text: ContractText;
  signature?: { image: string | null; name: string; at: Date } | null;
  approval?: { name: string; at: Date } | null;
  labels: { signedBy: string; date: string; approvedBy: string; notSigned: string };
}

const dataUrlBuffer = (v: string | null | undefined): Buffer | null => {
  const m = /^data:image\/(?:png|jpe?g);base64,([A-Za-z0-9+/=]+)$/.exec(v || "");
  return m ? Buffer.from(m[1], "base64") : null;
};

export function renderContractPdf(input: ContractPdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 56 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    const cjk = input.lang === "zh" ? registerCjk(doc) : false;
    const regular = cjk ? "cjk" : "Helvetica";
    const bold = cjk ? "cjk" : "Helvetica-Bold";
    doc.font(bold).fontSize(20).text(input.text.title, { align: "center" }).moveDown(1);
    doc.font(regular).fontSize(11).text(input.text.intro, { align: "left" }).moveDown(0.8);
    input.text.clauses.forEach((c, i) => {
      doc.font(bold).fontSize(11).text(`${i + 1}. ${c.heading}`).moveDown(0.15);
      doc.font(regular).fontSize(11).text(c.body).moveDown(0.7);
    });
    doc.moveDown(0.4).font(regular).fontSize(11).text(input.text.closing).moveDown(1.5);
    if (doc.y > 640) doc.addPage();
    const top = doc.y;
    const sig = input.signature;
    const img = sig ? dataUrlBuffer(sig.image) : null;
    doc.font(bold).fontSize(10).text(input.labels.signedBy, 56, top);
    if (sig && img) { try { doc.image(img, 56, top + 16, { fit: [180, 60] }); } catch { /* unreadable image: the typed name below still shows */ } }
    doc.font(regular).fontSize(10).text(sig ? `${sig.name}\n${input.labels.date}: ${sig.at.toISOString().slice(0, 10)}` : input.labels.notSigned, 56, top + 82);
    doc.font(bold).fontSize(10).text(input.labels.approvedBy, 330, top);
    if (input.approval) doc.font(regular).fontSize(10).text(`${input.approval.name}\n${input.labels.date}: ${input.approval.at.toISOString().slice(0, 10)}`, 330, top + 82);
    doc.end();
  });
}
