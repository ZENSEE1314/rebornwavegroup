import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseAmount, parseReceiptText, receiptTextScore } from "./receiptText";

const SAMPLE = [
  "CV SINAR BINTANG",
  "Jl. Sudirman No. 12 Jakarta",
  "Telp 0821-7603-100",
  "Faktur No: INV-2026/1044",
  "14/10/2026 14:05",
  "Bintang Pint 330ml 24 x 20.000 480.000",
  "2 Coca Cola 1L 15.000 30.000",
  "Es Batu 25.000",
  "Subtotal 535.000",
  "PPN 0",
  "TOTAL 535.000",
  "Tunai 600.000",
  "Kembali 65.000",
].join("\n");

describe("parseAmount", () => {
  it("should read a dot as the thousands mark", () => assert.equal(parseAmount("35.000"), 35000));
  it("should read a comma as the thousands mark", () => assert.equal(parseAmount("1,250,000"), 1250000));
  it("should read two digits after a point as decimals", () => assert.equal(parseAmount("4.50"), 4.5));
});

describe("parseReceiptText", () => {
  const read = parseReceiptText(SAMPLE);
  it("should find the supplier name", () => assert.equal(read.supplier, "CV SINAR BINTANG"));
  it("should find the address", () => assert.equal(read.supplierAddress, "Jl. Sudirman No. 12 Jakarta"));
  it("should find the phone number", () => assert.equal(read.supplierPhone, "0821-7603-100"));
  it("should find the invoice number", () => assert.equal(read.invoiceNo, "INV-2026/1044"));
  it("should find the date", () => assert.equal(read.date, "2026-10-14"));
  it("should find the time", () => assert.equal(read.time, "14:05"));
  it("should find the total and not the cash given", () => assert.equal(read.total, 535000));
  it("should list the three items and skip subtotal, tax, cash and change", () => assert.equal(read.items.length, 3));
  it("should read quantity and unit price of a 24 x 20.000 line", () => assert.deepEqual([read.items[0].qty, read.items[0].unitCost, read.items[0].lineTotal], [24, 20000, 480000]));
  it("should read a leading quantity", () => assert.deepEqual([read.items[1].name, read.items[1].qty, read.items[1].unitCost], ["Coca Cola 1L", 2, 15000]));
  it("should treat a single price as one piece", () => assert.deepEqual([read.items[2].qty, read.items[2].unitCost], [1, 25000]));
  it("should call a stock receipt goods", () => assert.equal(read.kind, "goods"));
});

describe("parseReceiptText on a bill and on rubbish", () => {
  it("should call an electricity bill an expense", () => assert.deepEqual([parseReceiptText("PLN\nListrik Oktober\nTOTAL 450.000").kind, parseReceiptText("PLN\nListrik Oktober\nTOTAL 450.000").category], ["expense", "utilities"]));
  it("should read a 2-digit year and a month name", () => assert.equal(parseReceiptText("Toko Maju\n5 Okt 26").date, "2026-10-05"));
  it("should give empty fields for text with nothing in it", () => assert.deepEqual([parseReceiptText("").supplier, parseReceiptText("").items.length, parseReceiptText("").total], ["", 0, 0]));
});

const REAL_INVOICE_PLAIN = [
  "PT. LIM SIANG HUAT Invoice",
  "Ry Komp. Int Batam Business & Industrial Park Ship/Bill To: ®",
  "Workshop Block A No. 58 Sei Panas - Bal ~",
  "e Tob (0778) 420359 030 Fat (0778) 31813 Invoice 26105064 A1050555 Reborn Wave House",
  "Ruko Oceanic Bliss, Jl Pasir Putih",
  "Date Your P.O. No. Ship Date Due Date salesperson PG.",
  "22-10-2026 05-11-26 R2M6C2 MN-P&B",
  "Qty. Unit Item No. Description Price Disc % Extended Price 1 Ek:",
  "Es 480 pes 01.1.101 CBN2D 24 Carlsberg Bottle 330ml Rp18,541.67 Rp8,900,000.00 1311",
  "Sale Amount Rpg 900,000.00",
  "Rek Danamon alc 88 0000 1326 a/n Lim Siang Huat Keprindo BALANCE Rp8,900,000.00 ®",
  "CA ale 833 5266 668 a/n Lim Siang Huat Keprindo",
].join("\n");
// the same invoice read after the photo was made larger and greyer: other letters are wrong, so the page must not depend on them
const REAL_INVOICE_SMUDGED = [
  "PT. LIM SIANG HUAT Invoice",
  "¥ - Komp. Inti Batam Business & Industrial Park Ship/Bill To: 6",
  "® Workshop Block A No. 5B Sei Panas - Batam i",
  "ran BUNGA Se Invoice ¥6105064 A1050555 Reborn Wave House",
  "Bip : (0778) 430359, 430360 Fax : (0778) 431813",
  "22-10-2026 05-11-26 ~~ R2M6C2  MN-P2B",
  "Eid 480 pcs 01.1.101CBN2D24 Carlsberg Bottle 330ml Rp18,541.67 Rp&,900,000.00 1318",
  "y Sale Amount Rp8,900,000.00",
].join("\n");

describe("parseReceiptText on a real invoice with one item", () => {
  for (const [label, text] of [["a clean read", REAL_INVOICE_PLAIN], ["a smudged read", REAL_INVOICE_SMUDGED]] as const) {
    const read = parseReceiptText(text);
    it(`should list only the one item (${label})`, () => assert.equal(read.items.length, 1));
    it(`should read its description, quantity and price (${label})`, () => assert.deepEqual([read.items[0].name, read.items[0].qty, read.items[0].unitCost], ["Carlsberg Bottle 330ml", 480, 18541.67]));
    it(`should take the invoice date, not the due date (${label})`, () => assert.equal(read.date, "2026-10-22"));
    it(`should read the supplier without the word Invoice (${label})`, () => assert.equal(read.supplier, "PT. LIM SIANG HUAT"));
    it(`should read the total (${label})`, () => assert.equal(read.total, 8900000));
    it(`should keep the supplier's address and leave the buyer's out (${label})`, () => assert.ok(read.supplierAddress.includes("Industrial Park") && !read.supplierAddress.includes("Oceanic")));
  }
});

const REAL_INVOICE_NO_TOTAL = [
  "@ TE - LJ",
  "Bip : (0778) 430359, 430360 Fax : (0778) 431813",
  "Invoice 6105064 22-10-2026 05-11-26",
  "Evid 480 pcs 01.1.101CBN2D24 Carlsberg Bottle 330ml Rp18,541.67 Rp&,900,000.00 1318",
  "[Yel Le omer abageg we WRG TT ee ITER Bi SET 5508",
].join("\n");

describe("parseReceiptText when the print is smudged and no total can be read", () => {
  const read = parseReceiptText(REAL_INVOICE_NO_TOTAL);
  it("should take the printed quantity and the price after it", () => assert.deepEqual([read.items[0].qty, read.items[0].unitCost], [480, 18541.67]));
  it("should drop a line of broken letters", () => assert.equal(read.items.length, 1));
  it("should leave an unreadable supplier empty instead of guessing", () => assert.equal(read.supplier, ""));
  it("should score a reading with a consistent item above a reading with none", () => assert.ok(receiptTextScore(read) > receiptTextScore(parseReceiptText("@ TE - LJ"))));
});
