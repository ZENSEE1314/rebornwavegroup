import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";

const server = readFileSync(new URL("../../../server/rebornGame.ts", import.meta.url), "utf8");
const admin = readFileSync(new URL("../pages/reborn-admin.tsx", import.meta.url), "utf8");
const commissionAdmin = readFileSync(new URL("./ItemCommissionAdmin.tsx", import.meta.url), "utf8");
const security = readFileSync(new URL("./SecurityPanel.tsx", import.meta.url), "utf8");
const payslips = readFileSync(new URL("../../../server/payslips.ts", import.meta.url), "utf8");

describe("pay period of sales and payroll", () => {
  it("should use the pay period in Payroll, sales targets and a person's own page", () => {
    assert.ok(server.includes("const {month,from,to,startDay:periodStartDay}=await payPeriodOf(") && server.includes("const { from, to } = await payPeriodOf(month);") && server.includes("const { month, from, to, startDay } = await payPeriodOf();"));
  });

  it("should settle the item commissions of the period when pay is recorded", () => {
    assert.ok(server.includes("created_at>=${new Date(settleFrom+") && server.includes("const {from:settleFrom,to:settleTo}=await payPeriodOf(month);"));
  });

  it("should name the period that just ended in the payday reminder", () => {
    assert.ok(payslips.includes("periodToPay(clock, await deps.payrollStartDay())"));
  });

  it("should let the admin set the start day and show the period on the Payroll page", () => {
    assert.ok(admin.includes('set("payrollStartDay", v)') && admin.includes('t("admin.pr.period"'));
  });
});

describe("security and the clock-in QR", () => {
  it("should let managers, the main admin and security guards open it", () => {
    assert.ok(server.includes('role !== "admin" && role !== "manager" && profile?.kind !== "guard"') && server.includes('app.get("/api/reborn/admin/attendance/qr", requireAttendanceQr('));
  });

  it("should keep changing the code with the main admin", () => {
    assert.ok(server.includes('app.post("/api/reborn/admin/attendance/rotate", requireAdmin('));
  });

  it("should show the card in the Security tab", () => {
    assert.ok(security.includes("<AttendanceQrCard />"));
  });
});

describe("products that earn no commission", () => {
  it("should be ticked in the add form, the phone card and the PC table", () => {
    assert.ok(admin.includes("checked={n.salesCommissionOk !== false}") && admin.includes("checked={f.salesCommissionOk !== false}") && admin.includes("checked={f.salesCommissionOk}"));
  });
});

describe("commission to the sales staff of a bill", () => {
  it("should show and change the credited person in the sale editor", () => {
    assert.ok(commissionAdmin.includes('t("itemCom.salesTo")') && commissionAdmin.includes("/sales-staff"));
  });

  it("should let only the main admin change it and log it", () => {
    assert.ok(server.includes('app.post("/api/reborn/admin/accounting/orders/:id/sales-staff", requireAdmin(') && server.includes('action: "edit_sales_staff"'));
  });
});

describe("two commission ticks on a product", () => {
  it("should have one tick for staff commission and one for customer (referrer) commission in the PC table", () => {
    assert.ok(admin.includes("checked={f.salesCommissionOk}") && admin.includes("checked={f.referralOk}") && admin.includes('t("admin.prod.referralCol")'));
  });

  it("should offer both ticks in the add form and the phone card", () => {
    assert.ok(admin.includes("checked={n.referralOk !== false}") && admin.includes("checked={f.referralOk !== false}"));
  });
});
