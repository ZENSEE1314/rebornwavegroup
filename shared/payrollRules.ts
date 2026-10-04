// Statutory payroll contributions by country: the part the company pays on top of the
// salary (employer) and the part taken off the staff member's salary (employee).
// Each company starts with its country's rates and its admin can change every number
// (Admin › Payroll), because governments update them every year.
//
// Singapore: CPF by age band (+ graduated rates for a PR's first two years), capped at
// the Ordinary Wage ceiling, plus the employer-only Skills Development Levy (SDL).
// Indonesia: BPJS Ketenagakerjaan (JHT, JP, JKK, JKM) + BPJS Kesehatan.
// Malaysia: EPF, SOCSO, EIS. Any other country: no lines until the admin adds them.
import { roundMoneyTo } from "./countries";

export interface ContributionLine {
  code: string;            // built-in code (label from i18n) or "custom-…"
  label?: string;          // the admin's own name for a custom line
  er: number;              // employer %
  ee: number;              // employee %
  cap?: number | null;     // wage cap: the % is taken from at most this much of the salary
  threshold?: number | null; // above this salary the employer pays erAbove % instead
  erAbove?: number | null;
}
export interface CpfBand { below: number; er: number; ee: number } // age below `below` (999 = any age)
export interface CpfRules {
  owCeiling: number;       // monthly Ordinary Wage ceiling
  bands: CpfBand[];
  pr1: { er: number; ee: number }; // PR, first year (graduated)
  pr2: { er: number; ee: number }; // PR, second year (graduated)
  sdlPct: number; sdlMin: number; sdlMax: number; // Skills Development Levy (employer only, every staff member)
}
export interface PayrollRules {
  country: string;
  scheme: "cpf" | "lines";
  lines: ContributionLine[];
  cpf?: CpfRules;
}
export type Residency = "citizen" | "pr1" | "pr2" | "foreigner";
export interface StaffStatutory { birthDate?: string | null; residency?: string | null; statutoryOn?: boolean | null }
export interface ContributionResult {
  lines: { code: string; label?: string; er: number; ee: number }[];
  employee: number;        // taken off the salary
  employer: number;        // paid by the company on top
  net: number;             // what the staff member receives
  cost: number;            // what the staff member costs the company
  age: number | null;
  band?: string;           // CPF band used (for the payslip)
}

export const DEFAULT_CPF: CpfRules = {
  owCeiling: 8000,
  bands: [
    { below: 55, er: 17, ee: 20 },
    { below: 60, er: 16, ee: 18 },
    { below: 65, er: 12.5, ee: 12.5 },
    { below: 70, er: 9, ee: 7.5 },
    { below: 999, er: 7.5, ee: 5 },
  ],
  pr1: { er: 4, ee: 5 },
  pr2: { er: 9, ee: 15 },
  sdlPct: 0.25, sdlMin: 2, sdlMax: 11.25,
};

export function defaultPayrollRules(country?: string | null): PayrollRules {
  const c = String(country || "ID").toUpperCase();
  if (c === "SG") return { country: c, scheme: "cpf", lines: [], cpf: JSON.parse(JSON.stringify(DEFAULT_CPF)) };
  if (c === "ID") return {
    country: c, scheme: "lines", lines: [
      { code: "jht", er: 3.7, ee: 2 },
      { code: "jp", er: 2, ee: 1, cap: 10547400 },
      { code: "jkk", er: 0.24, ee: 0 },
      { code: "jkm", er: 0.3, ee: 0 },
      { code: "bpjsKes", er: 4, ee: 1, cap: 12000000 },
    ],
  };
  if (c === "MY") return {
    country: c, scheme: "lines", lines: [
      { code: "epf", er: 13, ee: 11, threshold: 5000, erAbove: 12 },
      { code: "socso", er: 1.75, ee: 0.5, cap: 6000 },
      { code: "eis", er: 0.2, ee: 0.2, cap: 6000 },
    ],
  };
  return { country: c, scheme: "lines", lines: [] };
}

const num = (v: any, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const pct = (v: any) => Math.min(100, Math.max(0, num(v)));
const optMoney = (v: any) => (v === null || v === undefined || v === "" || !(Number(v) > 0) ? null : Number(v));

// Clean rules sent by the admin (or saved earlier) so the maths never sees junk.
export function cleanPayrollRules(r: any, country?: string | null): PayrollRules {
  const base = defaultPayrollRules(r?.country || country);
  if (!r || typeof r !== "object") return base;
  const scheme = r.scheme === "cpf" ? "cpf" : r.scheme === "lines" ? "lines" : base.scheme;
  const lines: ContributionLine[] = (Array.isArray(r.lines) ? r.lines : base.lines).slice(0, 20).map((l: any, i: number) => ({
    code: String(l?.code || `custom-${i + 1}`).slice(0, 40),
    label: l?.label ? String(l.label).slice(0, 60) : undefined,
    er: pct(l?.er), ee: pct(l?.ee), cap: optMoney(l?.cap),
    threshold: optMoney(l?.threshold), erAbove: l?.erAbove === null || l?.erAbove === undefined || l?.erAbove === "" ? null : pct(l.erAbove),
  }));
  let cpf: CpfRules | undefined;
  if (scheme === "cpf") {
    const src = r.cpf || {};
    const d = DEFAULT_CPF;
    const bands = (Array.isArray(src.bands) && src.bands.length ? src.bands : d.bands).slice(0, 8)
      .map((b: any) => ({ below: Math.max(1, Math.round(num(b?.below, 999))), er: pct(b?.er), ee: pct(b?.ee) }))
      .sort((a: CpfBand, b: CpfBand) => a.below - b.below);
    cpf = {
      owCeiling: Math.max(0, num(src.owCeiling, d.owCeiling)), bands,
      pr1: { er: pct(src.pr1?.er ?? d.pr1.er), ee: pct(src.pr1?.ee ?? d.pr1.ee) },
      pr2: { er: pct(src.pr2?.er ?? d.pr2.er), ee: pct(src.pr2?.ee ?? d.pr2.ee) },
      sdlPct: pct(src.sdlPct ?? d.sdlPct), sdlMin: Math.max(0, num(src.sdlMin, d.sdlMin)), sdlMax: Math.max(0, num(src.sdlMax, d.sdlMax)),
    };
  }
  return { country: String(r.country || base.country).toUpperCase().slice(0, 2), scheme, lines, cpf };
}

// Age on the first day of the payroll month: CPF moves to the next age band from the
// month after the birthday, which is exactly this.
export function ageAt(birthDate: string | null | undefined, month: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(birthDate || ""));
  const p = /^(\d{4})-(\d{2})/.exec(month);
  if (!m || !p) return null;
  const [by, bm, bd] = [+m[1], +m[2], +m[3]];
  const [y, mo] = [+p[1], +p[2]];
  let age = y - by;
  if (mo < bm || (mo === bm && 1 < bd)) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

export const RESIDENCIES: Residency[] = ["citizen", "pr1", "pr2", "foreigner"];
export const asResidency = (v: any): Residency => (RESIDENCIES.includes(v) ? v : "citizen");

// The contributions on one month's gross pay. `decimals` = the company currency's.
export function computeContributions(rules: PayrollRules, gross: number, staff: StaffStatutory, month: string, decimals = 0): ContributionResult {
  const wage = Math.max(0, Number(gross) || 0);
  const age = ageAt(staff.birthDate, month);
  const round = (n: number) => roundMoneyTo(n, decimals);
  const done = (lines: ContributionResult["lines"], band?: string): ContributionResult => {
    const employee = round(lines.reduce((s, l) => s + l.ee, 0));
    const employer = round(lines.reduce((s, l) => s + l.er, 0));
    return { lines, employee, employer, net: round(wage - employee), cost: round(wage + employer), age, band };
  };
  if (staff.statutoryOn === false || wage <= 0) return done([]);

  if (rules.scheme === "cpf" && rules.cpf) {
    const c = rules.cpf;
    const lines: ContributionResult["lines"] = [];
    const residency = asResidency(staff.residency);
    let band: string | undefined;
    if (residency !== "foreigner") {
      const ageBand = c.bands.find((b) => (age ?? 0) < b.below) || c.bands[c.bands.length - 1];
      const rate = residency === "pr1" ? c.pr1 : residency === "pr2" ? c.pr2 : ageBand;
      band = residency === "citizen" ? `<${ageBand.below}` : residency;
      const ow = c.owCeiling > 0 ? Math.min(wage, c.owCeiling) : wage;
      let total = 0, ee = 0;
      if (ow > 50) {
        const er = ow * rate.er / 100;
        // $50–$500: employer only. $500–$750: the employee's share is phased in.
        const eeFull = ow * rate.ee / 100;
        ee = ow <= 500 ? 0 : ow < 750 ? Math.min(eeFull, (rate.ee * 3 / 100) * (ow - 500)) : eeFull;
        total = Math.round(er + ee);   // CPF: total rounded to the nearest dollar
        ee = Math.floor(ee);           // employee share: cents dropped
      }
      lines.push({ code: "cpf", er: Math.max(0, total - ee), ee });
    }
    if (c.sdlPct > 0) {
      const sdl = Math.min(c.sdlMax || Infinity, Math.max(c.sdlMin, wage * c.sdlPct / 100));
      lines.push({ code: "sdl", er: Math.round(sdl * 100) / 100, ee: 0 });
    }
    return done(lines, band);
  }

  return done(rules.lines.map((l) => {
    const base = l.cap ? Math.min(wage, l.cap) : wage;
    const erPct = l.threshold && l.erAbove !== null && l.erAbove !== undefined && wage > l.threshold ? l.erAbove : l.er;
    return { code: l.code, label: l.label, er: round(base * erPct / 100), ee: round(base * l.ee / 100) };
  }));
}
