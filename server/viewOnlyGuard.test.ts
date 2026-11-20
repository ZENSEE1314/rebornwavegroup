import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { isWriteForbiddenToPartner } from "../shared/viewOnly";

const server = readFileSync(new URL("./rebornGame.ts", import.meta.url), "utf8");
const multiAuth = readFileSync(new URL("./multiAuth.ts", import.meta.url), "utf8");
const guard = readFileSync(new URL("./viewOnlyGuard.ts", import.meta.url), "utf8");

describe("what a view-only partner may send", () => {
  it("should be refused a change to the accounts", () => {
    assert.equal(isWriteForbiddenToPartner("POST", "/api/reborn/admin/accounting/ledger/5"), true);
  });

  it("should be refused a delete", () => {
    assert.equal(isWriteForbiddenToPartner("DELETE", "/api/reborn/admin/accounting/ledger/5"), true);
  });

  it("should be refused a refund of a sale", () => {
    assert.equal(isWriteForbiddenToPartner("POST", "/api/reborn/pos/orders/9/refund"), true);
  });

  it("should be refused a patch", () => {
    assert.equal(isWriteForbiddenToPartner("PATCH", "/api/reborn/admin/pos/products/3"), true);
  });

  it("should still read any page", () => {
    assert.equal(isWriteForbiddenToPartner("GET", "/api/reborn/admin/accounting/monthly"), false);
  });

  it("should still sign out", () => {
    assert.equal(isWriteForbiddenToPartner("POST", "/api/auth/logout"), false);
  });

  it("should still request a song like any member", () => {
    assert.equal(isWriteForbiddenToPartner("POST", "/api/reborn/songs/request"), false);
  });

  it("should still send a KOS gift like any member", () => {
    assert.equal(isWriteForbiddenToPartner("POST", "/api/reborn/kos/gift"), false);
  });

  it("should still care for the pet like any member", () => {
    assert.equal(isWriteForbiddenToPartner("POST", "/api/pets/1/feed"), false);
  });

  it("should be refused the staff service-call buttons", () => {
    assert.equal(isWriteForbiddenToPartner("POST", "/api/reborn/venue/service-calls/4/done"), true);
  });

  it("should be refused an unlisted call outside the member app", () => {
    assert.equal(isWriteForbiddenToPartner("PUT", "/api/v1/platform/companies/3/industries"), true);
  });

  it("should treat the method in any letter case", () => {
    assert.equal(isWriteForbiddenToPartner("post", "/api/reborn/pos/sale"), true);
  });
});

describe("view-only partner wiring", () => {
  it("should run the guard on every /api call right after the session", () => {
    assert.ok(multiAuth.includes('app.use("/api", viewOnlyGuard)') && multiAuth.indexOf("passport.session()") < multiAuth.indexOf('app.use("/api", viewOnlyGuard)'));
  });

  it("should answer 403 to a partner's change", () => {
    assert.ok(guard.includes("res.status(403)"));
  });

  it("should be set by the main admin in Users and tell the page it is view only", () => {
    assert.ok(server.includes('await setPartnerAdmin(id, b.role === "partner")') && server.includes("viewOnly: !!userId && (await isPartnerAdmin(userId))") && server.includes('app.post("/api/reborn/admin/users/:id", requireAdmin('));
  });
});
