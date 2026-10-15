// The employment contract letter (Admin › Payroll › Contract): the admin sets the role and start date, the wording is filled in here
// from the staff member's payroll profile. It is written in English, 中文 or Bahasa Indonesia (chosen per contract). The staff member
// signs it in the app, the admin approves it, and the PDF is e-mailed to both. This is a general template: a company should have a
// lawyer check the wording for its own country.
export type ContractLang = "en" | "zh" | "id";
export const CONTRACT_LANGS: ContractLang[] = ["en", "zh", "id"];
export const asContractLang = (v: unknown): ContractLang => (v === "zh" || v === "id" ? v : "en");

export type ContractStatus = "none" | "awaiting_staff" | "awaiting_approval" | "approved";

export interface ContractFields {
  company: string;
  staffName: string;
  jobTitle: string;
  employmentType: string; // full_time | part_time | contract
  startDate: string;      // yyyy-mm-dd or ""
  payType: string;        // salary | hourly
  /** Already formatted with the company's money, e.g. "RP 5.000.000". */
  baseSalary: string;
  hourlyRate: string;
  commissionRate: number;
  deposit: string;        // "" or formatted amount
  depositNote: string;
  extraTerms: string;     // free text added by the admin
  idNumber: string;
}

export interface ContractText { title: string; intro: string; clauses: { heading: string; body: string }[]; closing: string }

const T = {
  en: {
    title: "Letter of Employment Contract",
    intro: "This contract is made between {company} (the \"Company\") and {staff} (the \"Employee\").",
    role: "Position", roleBody: "The Employee is employed as {job} ({type}), starting on {start}.",
    paySalary: "Salary", paySalaryBody: "The Employee is paid a basic salary of {amount} per month.",
    payHourly: "Pay", payHourlyBody: "The Employee is paid {amount} per hour worked, based on the recorded attendance.",
    commission: "Commission", commissionBody: "A sales commission of {pct}% of the Employee's paid sales is added to the pay.",
    statutory: "Statutory contributions", statutoryBody: "Contributions required by law (for example CPF, BPJS or EPF) are calculated and withheld according to the Company's payroll rules.",
    deposit: "Deposit", depositBody: "The Employee gives the Company a deposit of {amount}{note}. The deposit covers the first month: a penalty in that month (for example for lateness) is taken from it. It is kept by the Company and the rest is returned when the employment ends, after any amount the Employee owes the Company has been settled.",
    deductions: "Deductions", deductionsBody: "From the second month on, a penalty (for example for lateness or damage) may be deducted from the salary. Each deduction is recorded with its reason on the payroll.",
    conduct: "Duties and conduct", conductBody: "The Employee follows the Company's rules, working hours and instructions, keeps the Company's and its customers' information private, and treats customers and colleagues with respect.",
    id: "Identity", idBody: "The Employee confirms that the identity document uploaded in the app is genuine and belongs to the Employee.{idno}",
    extra: "Additional terms",
    end: "Ending the employment", endBody: "Either side may end the employment by giving notice as required by the law of the country where the Employee works.",
    closing: "By signing below, the Employee confirms that they have read and understood this contract and agree to it. It starts when the Company approves it.",
    types: { full_time: "full-time", part_time: "part-time", contract: "fixed-term contract" },
  },
  zh: {
    title: "雇佣合同书",
    intro: "本合同由 {company}（以下简称“公司”）与 {staff}（以下简称“员工”）订立。",
    role: "职位", roleBody: "员工受聘担任 {job}（{type}），自 {start} 起生效。",
    paySalary: "薪资", paySalaryBody: "员工的基本月薪为 {amount}。",
    payHourly: "报酬", payHourlyBody: "员工按实际出勤记录，每工作一小时获得 {amount}。",
    commission: "提成", commissionBody: "员工已结账销售额的 {pct}% 将作为销售提成计入薪资。",
    statutory: "法定缴费", statutoryBody: "法律规定的缴费（如 CPF、BPJS 或 EPF）按公司的薪资规则计算并代扣。",
    deposit: "押金", depositBody: "员工向公司缴纳押金 {amount}{note}。押金用于覆盖第一个月：第一个月内的罚款（如迟到）从押金中扣除。押金由公司保管，雇佣关系结束并结清员工应付公司的款项后，余额退还。",
    deductions: "扣款", deductionsBody: "从第二个月起，罚款（如迟到或损坏物品）可从薪资中扣除。每笔扣款都会在薪资记录中注明原因。",
    conduct: "职责与行为", conductBody: "员工遵守公司的规定、工作时间和指示，对公司及客户的信息保密，并礼貌对待客户和同事。",
    id: "身份", idBody: "员工确认在应用中上传的身份证件真实有效，且属于员工本人。{idno}",
    extra: "补充条款",
    end: "终止雇佣", endBody: "任何一方均可按员工工作所在国家法律规定的通知期限终止雇佣关系。",
    closing: "员工在下方签名，即表示已阅读并理解本合同并表示同意。本合同自公司批准之日起生效。",
    types: { full_time: "全职", part_time: "兼职", contract: "定期合同" },
  },
  id: {
    title: "Surat Perjanjian Kerja",
    intro: "Perjanjian ini dibuat antara {company} (\"Perusahaan\") dan {staff} (\"Karyawan\").",
    role: "Jabatan", roleBody: "Karyawan dipekerjakan sebagai {job} ({type}), mulai {start}.",
    paySalary: "Gaji", paySalaryBody: "Karyawan menerima gaji pokok sebesar {amount} per bulan.",
    payHourly: "Upah", payHourlyBody: "Karyawan menerima {amount} per jam kerja, berdasarkan absensi yang tercatat.",
    commission: "Komisi", commissionBody: "Komisi penjualan sebesar {pct}% dari penjualan Karyawan yang telah dibayar ditambahkan ke gaji.",
    statutory: "Iuran wajib", statutoryBody: "Iuran yang diwajibkan hukum (misalnya CPF, BPJS atau EPF) dihitung dan dipotong sesuai aturan penggajian Perusahaan.",
    deposit: "Deposit", depositBody: "Karyawan menyerahkan deposit sebesar {amount}{note} kepada Perusahaan. Deposit menutupi bulan pertama: denda di bulan itu (misalnya karena terlambat) diambil dari deposit. Deposit disimpan Perusahaan dan sisanya dikembalikan saat hubungan kerja berakhir, setelah kewajiban Karyawan kepada Perusahaan diselesaikan.",
    deductions: "Potongan", deductionsBody: "Mulai bulan kedua, denda (misalnya karena terlambat atau kerusakan) dapat dipotong dari gaji. Setiap potongan dicatat beserta alasannya pada penggajian.",
    conduct: "Tugas dan sikap kerja", conductBody: "Karyawan mematuhi aturan, jam kerja, dan arahan Perusahaan, menjaga kerahasiaan informasi Perusahaan dan pelanggan, serta bersikap hormat kepada pelanggan dan rekan kerja.",
    id: "Identitas", idBody: "Karyawan menyatakan bahwa dokumen identitas yang diunggah di aplikasi adalah asli dan milik Karyawan.{idno}",
    extra: "Ketentuan tambahan",
    end: "Berakhirnya hubungan kerja", endBody: "Salah satu pihak dapat mengakhiri hubungan kerja dengan pemberitahuan sesuai hukum negara tempat Karyawan bekerja.",
    closing: "Dengan menandatangani di bawah, Karyawan menyatakan telah membaca, memahami, dan menyetujui perjanjian ini. Perjanjian berlaku setelah disetujui Perusahaan.",
    types: { full_time: "penuh waktu", part_time: "paruh waktu", contract: "kontrak waktu tertentu" },
  },
} as const;

const fill = (s: string, v: Record<string, string | number>) => Object.keys(v).reduce((a, k) => a.split(`{${k}}`).join(String(v[k])), s);

export function buildContractText(lang: ContractLang, f: ContractFields): ContractText {
  const t = T[lang];
  const type = (t.types as Record<string, string>)[f.employmentType] || t.types.full_time;
  const clauses: { heading: string; body: string }[] = [];
  clauses.push({ heading: t.role, body: fill(t.roleBody, { job: f.jobTitle || "—", type, start: f.startDate || "—" }) });
  if (f.payType === "hourly") clauses.push({ heading: t.payHourly, body: fill(t.payHourlyBody, { amount: f.hourlyRate }) });
  else clauses.push({ heading: t.paySalary, body: fill(t.paySalaryBody, { amount: f.baseSalary }) });
  if (f.commissionRate > 0) clauses.push({ heading: t.commission, body: fill(t.commissionBody, { pct: f.commissionRate }) });
  clauses.push({ heading: t.statutory, body: t.statutoryBody });
  if (f.deposit) clauses.push({ heading: t.deposit, body: fill(t.depositBody, { amount: f.deposit, note: f.depositNote ? ` (${f.depositNote})` : "" }) });
  clauses.push({ heading: t.deductions, body: t.deductionsBody });
  clauses.push({ heading: t.conduct, body: t.conductBody });
  clauses.push({ heading: t.id, body: fill(t.idBody, { idno: f.idNumber ? ` ID: ${f.idNumber}.` : "" }) });
  if (f.extraTerms.trim()) clauses.push({ heading: t.extra, body: f.extraTerms.trim() });
  clauses.push({ heading: t.end, body: t.endBody });
  return { title: t.title, intro: fill(t.intro, { company: f.company, staff: f.staffName }), clauses, closing: t.closing };
}
