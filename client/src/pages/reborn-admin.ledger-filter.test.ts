import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const admin = readFileSync(new URL("./reborn-admin.tsx", import.meta.url), "utf8");
const server = readFileSync(new URL("../../../server/rebornGame.ts", import.meta.url), "utf8");

test("should send kind, category and dates to the ledger route", () => {
  assert.match(admin, /accounting\/ledger\?\$\{ledgerQuery\}/);
  assert.match(admin, /type="date" value=\{lf\.from\}/);
});

test("should filter the ledger on the server by kind, category and day range in WIB", () => {
  assert.match(server, /req\.query\.kind === "income" \|\| req\.query\.kind === "expense"/);
  assert.match(server, /T00:00:00\+07:00/);
});

test("should show the order and closing popups on top of the page, not inside the card", () => {
  assert.match(admin, /selected&&createPortal\(<div className="fixed inset-0 z-\[80\]/);
  assert.match(admin, /selected&&createPortal\(<div className="fixed inset-0 z-\[90\]/);
});
