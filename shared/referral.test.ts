import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { referralCommission, type ReferralLine } from "./referral";

const line = (over: Partial<ReferralLine> = {}): ReferralLine => ({ name: "Beer", qty: 1, price: 40_000, lineTotal: 40_000, regularPrice: 40_000, isReferralOk: true, isPackage: false, ...over });
const bill = (over: Partial<Parameters<typeof referralCommission>[1]> = {}) => ({ subtotal: 40_000, discount: 0, total: 40_000, due: 40_000, percent: 10, ...over });

describe("referralCommission", () => {
  it("should pay the percent of a normal item", () => {
    assert.equal(referralCommission([line()], bill()).amount, 4_000);
  });

  it("should leave out an item sold at its happy-hour price", () => {
    const result = referralCommission([line({ price: 30_000, lineTotal: 30_000, name: "Happy beer" })], bill({ subtotal: 30_000, total: 30_000, due: 30_000 }));
    assert.deepEqual([result.amount, result.excluded], [0, ["Happy beer"]]);
  });

  it("should leave out the free unit of a buy 1 get 1 free deal", () => {
    const lines = [line(), line({ name: "Beer (free)", price: 0, lineTotal: 0 })];
    assert.equal(referralCommission(lines, bill()).base, 40_000);
  });

  it("should leave out an item the admin flagged", () => {
    const lines = [line(), line({ name: "Whisky", price: 100_000, lineTotal: 100_000, regularPrice: 100_000, isReferralOk: false })];
    const result = referralCommission(lines, bill({ subtotal: 140_000, total: 140_000, due: 140_000 }));
    assert.deepEqual([result.base, result.excluded], [40_000, ["Whisky"]]);
  });

  it("should leave out a package", () => {
    assert.equal(referralCommission([line({ isPackage: true })], bill()).amount, 0);
  });

  it("should lower the base in proportion to a bill discount", () => {
    assert.equal(referralCommission([line()], bill({ discount: 10_000, total: 30_000, due: 30_000 })).base, 30_000);
  });

  it("should count only the part paid in money when package credit paid the rest", () => {
    assert.equal(referralCommission([line()], bill({ due: 20_000 })).base, 20_000);
  });

  it("should pay nothing at 0 percent", () => {
    assert.equal(referralCommission([line()], bill({ percent: 0 })).amount, 0);
  });
});
