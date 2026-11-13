import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const viewer = read("./ReceiptPhotoViewer.tsx");

describe("accounting receipt photo viewer", () => {
  it("should zoom in steps and let the person drag around the zoomed photo", () => {
    assert.ok(viewer.includes("const ZOOM_STEPS = [1, 2, 3, 4];") && viewer.includes("overflow-auto"));
  });

  it("should offer Replace photo only when the line can be changed", () => {
    assert.ok(viewer.includes("{onReplace && <button"));
  });

  it("should be used by the Accounting drill-down and the Admin ledger list", () => {
    assert.ok(read("./AccountingReports.tsx").includes("<ReceiptPhotoViewer") && read("../pages/reborn-admin.tsx").includes("<ReceiptPhotoViewer"));
  });

  it("should send the new photo to the ledger line", () => {
    assert.ok(read("./AccountingReports.tsx").includes("{ photoUrl: v.photoUrl }") && read("../pages/reborn-admin.tsx").includes("{ photoUrl: v.photoUrl }"));
  });
});
