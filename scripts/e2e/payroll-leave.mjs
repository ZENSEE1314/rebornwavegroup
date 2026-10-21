// Payroll with leave, MC and absence (unpaid days come off the salary, months with no leave), and a security guard with fixed shift hours and no attendance. Run against the local test server (see README.md).
import pg from "pg";
const BASE = "http://127.0.0.1:3999";
let failures = 0;
const makeClient = () => {
  let cookie = "";
  return async (method, path, body) => {
    const res = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined, redirect: "manual" });
    const set = res.headers.getSetCookie?.() || []; if (set.length) cookie = set.map((c) => c.split(";")[0]).join("; ");
    const text = await res.text(); let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, json };
  };
};
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : "  → " + extra)); if (!ok) failures++; };
const db = new pg.Client({ connectionString: "postgres://postgres:pw@127.0.0.1:54329/reborn" }); await db.connect();
const tag = Date.now().toString(36);
const digits = tag.replace(/\D/g, "").padEnd(7, "7").slice(0, 7);

const admin = makeClient();
await admin("POST", "/api/auth/login", { email: "admin@test.local", password: "Passw0rd!" });
const company = (await db.query("SELECT id FROM bridge_companies WHERE slug=$1", ["reborn-wave-group"])).rows[0];
const makeStaff = async (label, n) => {
  const email = `${label}${tag}@test.local`;
  await makeClient()("POST", "/api/auth/register", { email, password: "Passw0rd!", firstName: label, lastName: "Pay", phoneNumber: `08185${n}${digits}`.slice(0, 12), dateOfBirth: "1995-01-01", gender: "male" });
  await db.query("UPDATE users SET role='staff' WHERE email=$1", [email]);
  const id = (await db.query("SELECT id FROM users WHERE email=$1", [email])).rows[0].id;
  await db.query("INSERT INTO bridge_company_members (company_id, user_id, role) VALUES ($1,$2,'staff') ON CONFLICT DO NOTHING", [company.id, id]);
  return id;
};
const rowOf = async (userId, month) => (await admin("GET", `/api/reborn/admin/payroll?month=${month}`)).json.staff.find((x) => x.user_id === userId);

const worker = await makeStaff("worker", "1");
const guard = await makeStaff("guard", "2");
await admin("POST", "/api/reborn/admin/payroll/profile", { userId: worker, payType: "salary", baseSalary: 2600000 });
await admin("PUT", "/api/reborn/admin/payroll/leave-rules", { noLeaveMonths: [], payDays: 26 });

const leave = (userId, type, start, end, paid) => db.query("INSERT INTO leave_requests (company_id, user_id, type, start_date, end_date, reason, status, paid) VALUES ($1,$2,$3,$4,$5,'test','approved',$6)", [company.id, userId, type, start, end, paid]);
const shift = (userId, date) => db.query("INSERT INTO worker_shifts (company_id, user_id, shift_date, start_time, end_time) VALUES ($1,$2,$3,'10:00','18:00')", [company.id, userId, date]);
const attended = (userId, date) => db.query("INSERT INTO staff_attendance (company_id, user_id, work_date, check_in_at, check_out_at) VALUES ($1,$2,$3,now(),now())", [company.id, userId, date]);

// October: 2 days of paid leave, 1 day of MC, two scheduled days of which one was missed
await leave(worker, "leave", "2026-10-05", "2026-10-06", true);
await leave(worker, "mc", "2026-10-12", "2026-10-12", true);
await shift(worker, "2026-10-03"); await shift(worker, "2026-10-04"); await attended(worker, "2026-10-03");
let row = await rowOf(worker, "2026-10");
check("MC, leave and absent days are counted", row.leave.mcDays === 1 && row.leave.leaveDays === 2 && row.leave.absentDays === 1, JSON.stringify(row.leave));
check("paid leave and MC cost nothing in a normal month; only the missed day comes off", row.leave.unpaidDays === 1 && Number(row.deduction) === 100000, JSON.stringify([row.leave, row.deduction]));
check("the deduction box starts filled in with a reason", /not at work/.test(row.deduction_note || ""), String(row.deduction_note));

// a month with no leave: every leave and MC day is unpaid
let r = await admin("PUT", "/api/reborn/admin/payroll/leave-rules", { noLeaveMonths: ["2026-10", "bad", "2026-10"], payDays: 26 });
check("the no-leave months are saved clean", r.status === 200 && JSON.stringify(r.json.noLeaveMonths) === JSON.stringify(["2026-10"]), JSON.stringify(r));
row = await rowOf(worker, "2026-10");
check("in a no-leave month leave and MC days are unpaid too (3 + 1 absent = 4 days)", row.leave.isNoLeaveMonth && row.leave.unpaidDays === 4 && Number(row.deduction) === 400000, JSON.stringify([row.leave, row.deduction]));

// unpaid leave in another month
await leave(worker, "leave", "2026-09-10", "2026-09-11", false);
row = await rowOf(worker, "2026-09");
check("leave the approver marked unpaid comes off in any month", row.leave.unpaidDays === 2 && Number(row.deduction) === 200000, JSON.stringify([row.leave, row.deduction]));

// days of pay
r = await admin("PUT", "/api/reborn/admin/payroll/leave-rules", { noLeaveMonths: ["2026-10"], payDays: 0 });
check("an empty number of pay days falls back to 26", r.json.payDays === 26, JSON.stringify(r.json));
r = await admin("PUT", "/api/reborn/admin/payroll/leave-rules", { noLeaveMonths: ["2026-10"], payDays: 20 });
row = await rowOf(worker, "2026-09");
check("one day of pay follows the days of pay set", Number(row.deduction) === 260000, JSON.stringify(row.deduction));

// recording the pay takes the deduction off the salary expense
r = await admin("POST", "/api/reborn/admin/payroll/pay", { userId: worker, name: "Worker", month: "2026-09", amount: 2600000, deduction: Number(row.deduction), deductionNote: row.deduction_note });
const booked = (await db.query("SELECT amount FROM ledger_entries WHERE ref_type='payroll' AND ref_id=$1", [`${worker}:2026-09`])).rows[0];
check("the recorded salary is smaller by the unpaid days", r.status === 200 && Number(booked.amount) === 2600000 - 260000, JSON.stringify([r.status, booked]));

// a security guard: fixed hours, no attendance
r = await admin("POST", "/api/reborn/admin/payroll/profile", { userId: guard, payType: "salary", baseSalary: 3000000, staffKind: "guard", shiftStart: "18:00", shiftEnd: "06:00", needsAttendance: false });
check("a security guard profile is saved with the night shift", r.status === 200 && r.json.staffKind === "guard" && r.json.shiftStart === "18:00" && r.json.shiftEnd === "06:00" && r.json.needsAttendance === false, JSON.stringify(r));
await shift(guard, "2026-10-03"); // scheduled, never checked in
row = await rowOf(guard, "2026-10");
check("the payroll row knows the guard and his hours", row.staff_kind === "guard" && row.shift_start === "18:00" && row.shift_end === "06:00" && row.needs_attendance === false, JSON.stringify(row));
check("a guard is never counted absent and has his full monthly pay", row.leave.absentDays === 0 && Number(row.basic) === 3000000 && !(Number(row.deduction) > 0), JSON.stringify([row.leave, row.basic, row.deduction]));
r = await admin("POST", "/api/reborn/admin/payroll/profile", { userId: guard, payType: "salary", baseSalary: 3000000, staffKind: "guard", shiftStart: "6pm", shiftEnd: "nope" });
check("a shift time that is not HH:MM is ignored", r.status === 200 && r.json.shiftStart === null && r.json.shiftEnd === null, JSON.stringify(r));

await admin("PUT", "/api/reborn/admin/payroll/leave-rules", { noLeaveMonths: [], payDays: 26 });
await db.end();
console.log(failures ? `${failures} FAILED` : "ALL PASSED");
process.exit(failures ? 1 : 0);
