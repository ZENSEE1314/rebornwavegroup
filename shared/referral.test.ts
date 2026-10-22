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

import { isReferralHeld, referralReleaseAt } from "./referral";

describe("the hold on a new referral", () => {
  const linked = new Date("2026-10-22T10:00:00Z");
  it("should release the referral 18 hours after it was made", () => assert.equal(referralReleaseAt(linked, 18).toISOString(), "2026-10-23T04:00:00.000Z"));
  it("should hold a bill paid 17 hours after the link", () => assert.equal(isReferralHeld(linked, 18, new Date("2026-10-23T03:00:00Z")), true));
  it("should pay a bill paid 19 hours after the link", () => assert.equal(isReferralHeld(linked, 18, new Date("2026-10-23T05:00:00Z")), false));
  it("should never hold when the hold is 0 hours", () => assert.equal(isReferralHeld(linked, 0, new Date("2026-10-22T10:00:01Z")), false));
});
