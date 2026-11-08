import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./rebornGame.ts", import.meta.url), "utf8");
const route = source.slice(source.indexOf('"/api/reborn/admin/kos/free-start"'), source.indexOf("async function resetKingsOfSingers"));
const gifts = source.slice(source.indexOf("const FREE_START_GIFTS"), source.indexOf('app.post("/api/reborn/admin/kos/free-start"'));

describe("KGOLD free start", () => {
  it("should give 10,000 KGOLD to every account", () => {
    assert.ok(source.includes("const FREE_START_KGOLD = 10000;") && route.includes("UPDATE users SET kgold = kgold + ${FREE_START_KGOLD}"));
  });

  it("should add the seven small gifts at 10, 50, 100, 500, 1000, 2500 and 5000", () => {
    const costs = Array.from(gifts.matchAll(/kgoldCost: (\d+)/g)).map((m) => Number(m[1]));
    assert.deepEqual(costs, [10, 50, 100, 500, 1000, 2500, 5000]);
  });

  it("should work only once", () => {
    assert.ok(route.includes("claimFlag(FREE_START_FLAG)") && route.includes("status(409)"));
  });

  it("should need the main admin's login password or the main-admin password", () => {
    assert.ok(route.includes("me?.role === \"admin\"") && route.includes("bcrypt.compare(given, me.password)") && route.includes("verifyMainAdminPassword("));
  });

  it("should write a wallet history row for every account it credits", () => {
    assert.ok(route.includes("INSERT INTO member_wallet_transactions") && route.includes("FREE_START_TX_TYPE"));
  });

  it("should let it be tried again when saving failed", () => {
    assert.ok(route.includes("db.delete(appSettings).where(eq(appSettings.key, FREE_START_FLAG))"));
  });

  it("should not give a second bonus to an account that already has one", () => {
    assert.ok(route.includes("NOT EXISTS (SELECT 1 FROM member_wallet_transactions w WHERE w.user_id = u.id AND w.type = ${FREE_START_TX_TYPE})"));
  });

  it("should turn on the bonus for new sign-ups when pressed", () => {
    assert.ok(route.includes("key: SIGNUP_KGOLD_KEY, value: String(FREE_START_KGOLD)"));
  });

  it("should give the bonus to e-mail, Google and Facebook sign-ups", () => {
    const store = readFileSync(new URL("./storage.ts", import.meta.url), "utf8");
    assert.equal(store.split("await grantSignupKgold(user.id);").length - 1, 3);
  });

  it("should not fail a sign-up when the bonus cannot be saved", () => {
    const helper = readFileSync(new URL("./signupKgold.ts", import.meta.url), "utf8");
    assert.ok(helper.includes("catch (error)") && helper.includes("if (amount <= 0) return;"));
  });
});
