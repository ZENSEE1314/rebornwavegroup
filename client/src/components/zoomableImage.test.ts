import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("menu photos on the food order pages", () => {
  it("should open full size on the member order page", () => {
    assert.ok(read("../pages/reborn-order.tsx").includes("<ZoomableImage src={p.imageUrl}"));
  });

  it("should open full size on the table QR order page", () => {
    assert.ok(read("../pages/order-table.tsx").includes("<ZoomableImage src={m.imageUrl}"));
  });

  it("should close when the person taps the picture area", () => {
    assert.ok(read("./ZoomableImage.tsx").includes("onClick={() => setIsOpen(false)} role=\"dialog\""));
  });
});
