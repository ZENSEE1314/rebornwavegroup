import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { asContractLang, buildContractText, type ContractFields } from "./staffContract";

const base: ContractFields = { company: "Reborn", staffName: "Ana", jobTitle: "Waiter", employmentType: "full_time", startDate: "2026-11-01", payType: "salary", baseSalary: "RP 5.000.000", hourlyRate: "RP 0", commissionRate: 0, deposit: "", depositNote: "", extraTerms: "", idNumber: "" };

describe("staff contract text", () => {
  it("should name the company, the staff member, the role and the salary", () => {
    const c = buildContractText("en", base);
    assert.match(c.intro, /Reborn.*Ana/);
    assert.match(c.clauses[0].body, /Waiter.*full-time.*2026-11-01/);
    assert.match(c.clauses[1].body, /RP 5\.000\.000/);
  });
  it("should add deposit, commission and extra terms only when they are set", () => {
    const plain = buildContractText("id", base);
    assert.equal(plain.clauses.some((x) => x.heading === "Deposit" || x.heading === "Komisi" || x.heading === "Ketentuan tambahan"), false);
    const full = buildContractText("zh", { ...base, deposit: "RP 500.000", depositNote: "制服", commissionRate: 3, extraTerms: "每周休息一天" });
    assert.ok(full.clauses.some((x) => x.heading === "押金" && x.body.includes("RP 500.000") && x.body.includes("（制服）") === false && x.body.includes("(制服)")));
    assert.ok(full.clauses.some((x) => x.heading === "补充条款" && x.body === "每周休息一天"));
  });
  it("should use the hourly rate for an hourly employee and fall back to English", () => {
    assert.match(buildContractText("en", { ...base, payType: "hourly", hourlyRate: "RP 30.000" }).clauses[1].body, /RP 30\.000 per hour/);
    assert.equal(asContractLang("fr"), "en");
    assert.equal(asContractLang("zh"), "zh");
  });
  it("should add a job scope clause only when duties are given", () => {
    assert.equal(buildContractText("en", base).clauses.some((x) => x.heading === "Job scope"), false);
    const withScope = buildContractText("id", { ...base, jobScope: "- Melayani tamu\n- Menjaga kebersihan" });
    assert.ok(withScope.clauses.some((x) => x.heading === "Lingkup pekerjaan" && x.body.includes("Melayani tamu")));
  });
});
