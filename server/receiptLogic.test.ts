import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { PACK_UNIT_RE, cleanReceipt, cleanSaveLines, matchProduct, nameScore, normName, receiptNote } from "./receiptLogic";

const products = [
  { id: 1, name: "Bintang 620ml" },
  { id: 2, name: "Coca-Cola 330ml" },
  { id: 3, name: "Chivas Regal 12" },
  { id: 4, name: "Ice cube bag" },
];

describe("normName / nameScore", () => {
  it("should treat the same item written two ways as equal", () => {
    assert.equal(normName("BINTANG 620 ML"), "bintang 620ml");
    assert.equal(nameScore("Bintang 620 ML", "bintang 620ml"), 1);
  });
  it("should score unrelated names low", () => {
    assert.ok(nameScore("Ice cube bag", "Chivas Regal 12") < 0.3);
  });
});

describe("matchProduct", () => {
  it("should use the AI's pick when it names a real item", () => {
    assert.equal(matchProduct({ name: "BTG LRG", matchedProduct: "Bintang 620ml" }, products), 1);
  });
  it("should fall back to the closest name", () => {
    assert.equal(matchProduct({ name: "COCA COLA 330 ML CAN" }, products), 2);
    assert.equal(matchProduct({ name: "Chivas Regal 12yo" }, products), 3);
  });
  it("should leave a line nothing matches as a new item", () => {
    assert.equal(matchProduct({ name: "Paper napkins", matchedProduct: "Napkins" }, products), null);
  });
});

describe("cleanReceipt", () => {
  it("should drop empty lines, round quantities and work out a missing unit price", () => {
    const r = cleanReceipt({ supplier: " PT  Bir ", date: "2026-10-14", items: [{ name: "", qty: 3 }, { name: "Bintang", qty: 2.6, lineTotal: 105000 }, { name: "Ice", qty: 0, unitCost: 5000 }] });
    assert.equal(r.supplier, "PT Bir");
    assert.equal(r.items.length, 2);
    assert.deepEqual([r.items[0].qty, r.items[0].unitCost], [3, 35000]);
    assert.deepEqual([r.items[1].qty, r.items[1].unitCost], [1, 5000]);
  });
  it("should drop a date that isn't YYYY-MM-DD", () => {
    assert.equal(cleanReceipt({ date: "14/10/2026", items: [] }).date, "");
  });
});

describe("cleanSaveLines", () => {
  it("should keep only lines with a quantity and an item or a name", () => {
    const lines = cleanSaveLines([{ productId: 1, qty: 24, unitCost: 35000 }, { name: "New wine", qty: 6, unitCost: -5 }, { name: "", qty: 3 }, { productId: 2, qty: 0 }]);
    assert.deepEqual(lines, [{ name: "", qty: 24, unitCost: 35000, productId: 1, packSize: 1 }, { name: "New wine", qty: 6, unitCost: 0, productId: null, packSize: 1 }]);
  });
});

describe("receiptNote", () => {
  it("should name the supplier, invoice, date and lines", () => {
    assert.equal(receiptNote({ supplier: "PT Bir", invoiceNo: "INV-9", date: "2026-10-14" }, [{ name: "Bintang", qty: 24 }, { name: "Cola", qty: 6 }]),
      "Receipt INV-9 from PT Bir (2026-10-14): 24 × Bintang, 6 × Cola");
  });
});

describe("pack sizes on a receipt", () => {
  it("should default a saved line to a single unit", () => {
    assert.equal(cleanSaveLines([{ name: "Cola", qty: 3, unitCost: 5000 }])[0].packSize, 1);
  });
  it("should keep the pack size a line is priced in", () => {
    assert.equal(cleanSaveLines([{ name: "Heineken", qty: 30, unitCost: 480000, packSize: 24 }])[0].packSize, 24);
  });
  it("should ignore a pack size that is not a whole number above zero", () => {
    assert.equal(cleanSaveLines([{ name: "Cola", qty: 1, unitCost: 1, packSize: -5 }])[0].packSize, 1);
  });
  it("should know the unit words that mean a pack", () => {
    assert.ok(["Dus", "Ctn-24", "Karton", "Box"].every((u) => PACK_UNIT_RE.test(u)));
  });
  it("should not treat a bottle as a pack", () => {
    assert.equal(PACK_UNIT_RE.test("Botol"), false);
  });
});
