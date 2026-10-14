import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MANAGER_TABS, cleanTabAccess, tabsForRole, visibleTabs } from "./adminTabs";

describe("the tabs of each kind of account", () => {
  it("should give a manager users, products and inventory", () => {
    for (const tab of ["Users", "Products", "Inventory"]) assert.ok((MANAGER_TABS as readonly string[]).includes(tab), tab);
  });
  it("should keep settings for the main admin only", () => assert.equal(tabsForRole("manager").includes("Settings"), false));
  it("should give staff no inventory", () => assert.equal(tabsForRole("staff").includes("Inventory"), false));
});

describe("what one account sees", () => {
  it("should see all of its tabs when nothing is set", () => assert.deepEqual(visibleTabs("manager", null), [...tabsForRole("manager")]));
  it("should see only the ticked tabs", () => assert.deepEqual(visibleTabs("manager", ["Overview", "Products"]), ["Overview", "Products"]));
  it("should always keep Overview", () => assert.equal(visibleTabs("manager", ["Products"]).includes("Overview"), true));
  it("should never gain a tab its kind of account does not have", () => assert.equal(visibleTabs("staff", ["Overview", "Settings"]).includes("Settings"), false));
});

describe("saving the ticked tabs", () => {
  it("should store no limit when everything is ticked", () => assert.equal(cleanTabAccess([...tabsForRole("staff")], "staff"), null));
  it("should store a limit when some are left out", () => assert.deepEqual(cleanTabAccess(["Overview", "Bookings"], "staff"), ["Overview", "Bookings"]));
  it("should drop names that are not tabs", () => assert.deepEqual(cleanTabAccess(["Overview", "Hack"], "staff"), ["Overview"]));
  it("should read anything that is not a list as no limit", () => assert.equal(cleanTabAccess("x", "staff"), null));
});
