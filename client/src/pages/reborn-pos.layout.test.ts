import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// POS work area: on a PC the bill and the ordering each scroll on their own (no scrolling a long page to reach the bill); on a phone the bill is on top and the ordering is below.
// Pop-ups (receipt, closing report, cash drawer set-up) render in front of the page, never at the top of it while the cashier is scrolled down.
const WINDOWS_LINE_END = /\r\n/g;
const source = readFileSync(new URL("./reborn-pos.tsx", import.meta.url), "utf8").replace(WINDOWS_LINE_END, "\n");
const count = (text: string, part: string) => text.split(part).length - 1;
const ticketDetail = source.slice(source.indexOf("function TicketDetail("), source.indexOf("function TicketDetail(") + 40_000);

describe("POS panes", () => {
  it("should make the table bill two panes with their own scroll on a PC", () => {
    assert.ok(ticketDetail.includes("TWO_PANES + ") && source.includes('PANE_SCROLL = "lg:min-h-0 lg:overflow-y-auto'));
  });
  it("should show the bill above the ordering on a phone (table bill)", () => {
    assert.ok(ticketDetail.includes("order-1 lg:order-2 ${PANE_SCROLL}") && ticketDetail.includes("order-2 lg:order-1 ${PANE_SCROLL}"));
  });
  it("should use the same two panes on Quick sale", () => {
    assert.ok(source.includes("TWO_PANES_QUICK + ") && count(source, "${PANE_SCROLL}") >= 4);
  });
  it("should bring the panes into view on a PC when a bill opens", () => {
    assert.equal(count(source, "useBringWorkAreaIntoView();"), 2);
  });
});

describe("POS pop-ups", () => {
  it("should draw the receipt through a portal in both places it is shown", () => {
    assert.equal(count(source, "createPortal(<ReceiptPreview"), 2);
    assert.equal(count(source, "<ReceiptPreview"), 2);
  });
  it("should draw the closing report and the cash drawer set-up through a portal", () => {
    assert.ok(source.includes("createPortal(<ClosingReport") && source.includes("createPortal(<DrawerSetup"));
  });
});
