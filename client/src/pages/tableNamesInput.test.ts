import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./reborn-admin.tsx", import.meta.url), "utf8");

describe("booking area table names field", () => {
  it("should keep the typed text so a trailing comma stays", () => {
    assert.ok(source.includes("function TableNamesInput") && source.includes("const [text, setText] = useState(tables.join"));
  });

  it("should not rebuild the field from the parsed list on every key", () => {
    assert.ok(!source.includes('value={(a.tables || []).join(", ")}'));
  });

  it("should split names on a comma or a new line", () => {
    assert.ok(source.includes("text.split(/[,\\n]/)"));
  });
});
