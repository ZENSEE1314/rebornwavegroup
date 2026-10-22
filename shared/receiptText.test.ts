import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseAmount, parseReceiptText } from "./receiptText";

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
