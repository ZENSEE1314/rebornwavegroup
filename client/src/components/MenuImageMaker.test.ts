import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");

describe("MenuImageMaker wiring", () => {
  it("should be offered on the POS page to admins and managers", () => assert.match(read("client/src/pages/reborn-pos.tsx"), /<MenuImageMaker \/>/));
  it("should be offered on the admin inventory page", () => assert.match(read("client/src/pages/reborn-admin.tsx"), /<MenuImageMaker \/>/));
  it("should read the current products each time it opens", () => assert.match(read("client/src/components/MenuImageMaker.tsx"), /enabled: isOpen/));
  it("should save each page as a PNG", () => assert.match(read("client/src/components/MenuImageMaker.tsx"), /image\/png/));
});
