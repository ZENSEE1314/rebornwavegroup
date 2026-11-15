import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { cleanTabAccess, tabsForRole, visibleTabs } from "../../../shared/adminTabs";

const server = readFileSync(new URL("../../../server/rebornGame.ts", import.meta.url), "utf8");
const admin = readFileSync(new URL("../pages/reborn-admin.tsx", import.meta.url), "utf8");
const usersRoute = server.slice(server.indexOf('app.get("/api/reborn/admin/users", requireStaff('), server.indexOf('app.delete("/api/reborn/admin/users/:id"'));

describe("Security account tabs", () => {
  it("should see only Overview, Users and Security", () => {
    assert.deepEqual(visibleTabs("security", null), ["Overview", "Users", "Security"]);
  });

  it("should be narrowed further by the main admin but never gain a tab", () => {
    assert.deepEqual(cleanTabAccess(["Users", "Pet"], "security"), ["Overview", "Users"]);
  });

  it("should not have the staff tabs", () => {
    assert.ok(!tabsForRole("security").includes("POS"));
  });
});

describe("Security account on the server", () => {
  it("should be a staff account whose payroll kind is Security guard", () => {
    assert.ok(server.includes("async function isSecurityAccount") && server.includes('staff_kind === "guard"'));
  });

  it("should tell the admin page its role is security", () => {
    assert.ok(server.includes('role: (await isSecurityAccount(userId)) ? "security" : await adminRole(userId)'));
  });

  it("should list only staff and normal members, without balances", () => {
    assert.ok(usersRoute.includes('u.role !== "admin" && !["manager", "owner", "admin"].includes(u.member_role)') && !usersRoute.slice(usersRoute.indexOf("const plain")).split("return res.json")[0].includes("credits"));
  });

  it("should leave changing users to the main admin", () => {
    assert.ok(server.includes('app.post("/api/reborn/admin/users/:id", requireAdmin('));
  });

  it("should set the guard kind when the role is security", () => {
    assert.ok(server.includes('{ staffKind: "guard", needsAttendance: false }'));
  });
});

describe("Security option in Admin › Users", () => {
  it("should be a role the main admin can pick", () => {
    assert.ok(admin.includes('<option value="security">{t("admin.role.securitySub")}</option>'));
  });
});
