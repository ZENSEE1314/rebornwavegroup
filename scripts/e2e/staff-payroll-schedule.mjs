import pg from "pg";
const BASE = "http://127.0.0.1:3999";
let failures = 0;
function session() {
  let cookie = "";
  return async (method, path, body) => {
    const res = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined, redirect: "manual" });
    const set = res.headers.getSetCookie?.() || [];
    if (set.length) cookie = set.map((c) => c.split(";")[0]).join("; ");
    const buf = Buffer.from(await res.arrayBuffer());
    const type = res.headers.get("content-type") || "";
    let json = null; if (type.includes("json")) { try { json = JSON.parse(buf.toString()); } catch { /* not json */ } }
    return { status: res.status, json, type, size: buf.length, head: buf.subarray(0, 5).toString() };
  };
}
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : "  → " + extra)); if (!ok) failures++; };
const db = new pg.Client({ connectionString: "postgres://postgres:pw@127.0.0.1:54329/reborn" }); await db.connect();
const one = async (sql, args = []) => (await db.query(sql, args)).rows[0];
const admin = session(), staff = session(), member = session();

async function newUser(call, email, first, last, phone) {
  const r = await call("POST", "/api/auth/register", { email, password: "Passw0rd!", firstName: first, lastName: last, phoneNumber: phone, dateOfBirth: "1992-02-02", gender: "female" });
  await call("POST", "/api/auth/login", { email, password: "Passw0rd!" });
  return r.json?.id;
}
await admin("POST", "/api/auth/login", { email: "admin@test.local", password: "Passw0rd!" });
const staffId = await newUser(staff, "sari@test.local", "Sari", "Fake", "081200000002");
const memberId = await newUser(member, "guest@test.local", "Guest", "One", "081200000003");
check("username defaults to the email", (await one("select username from users where id=$1", [memberId])).username === "guest@test.local", "");
await db.query("UPDATE users SET role='staff' WHERE id=$1", [staffId]);
await staff("POST", "/api/auth/login", { email: "sari@test.local", password: "Passw0rd!" });
const company = await one("select id from bridge_companies where slug='reborn-wave-group'");
let position = await one("select id from bridge_positions where company_id=$1 and name='Waiter'", [company.id]);
if (!position) position = await one("insert into bridge_positions (company_id,name,code) values ($1,'Waiter','waiter') returning id", [company.id]);
await db.query("insert into bridge_company_members (company_id,user_id,role,position_id) values ($1,$2,'staff',$3) on conflict (company_id,user_id) do update set role='staff', position_id=$3", [company.id, staffId, position.id]);

// ---- Users list: an un-enrolled sign-up shows, a cleared "Removed user" does not
await db.query("insert into users (id, first_name, last_name, referral_code, role) values ('removed-1','Removed','user','RC-REM','user') on conflict do nothing");
let r = await admin("GET", "/api/reborn/admin/users");
const names = r.json.users.map((u) => u.email || u.firstName);
check("un-enrolled sign-up is listed", r.json.users.some((u) => u.email === "guest@test.local"), JSON.stringify(names));
check("cleared Removed-user is not listed", !r.json.users.some((u) => u.id === "removed-1"), "");

// ---- real name + support list + rating hide + rating
r = await member("GET", "/api/reborn/support/staff");
check("member sees the staff list", r.status === 200 && r.json.some((s) => s.id === staffId && s.name === "Sari Fake"), JSON.stringify(r.json));
r = await admin("PUT", `/api/reborn/admin/staff-real-name/${staffId}`, { name: "Siti Rahma" });
check("real name saved", r.status === 200, JSON.stringify(r.json));
r = await member("GET", "/api/reborn/support/staff");
check("support list shows the real name", r.json.some((s) => s.id === staffId && s.name === "Siti Rahma"), JSON.stringify(r.json));
r = await admin("PUT", `/api/reborn/admin/rating-hidden/${staffId}`, { hidden: true });
r = await member("GET", "/api/reborn/support/staff");
check("hidden person leaves the list", !r.json.some((s) => s.id === staffId), JSON.stringify(r.json));
r = await member("POST", "/api/reborn/support/rate-staff", { staffUserId: staffId, rating: 5 });
check("hidden person can't be rated", r.status === 404, r.status);
await admin("PUT", `/api/reborn/admin/rating-hidden/${staffId}`, { hidden: false });
r = await member("POST", "/api/reborn/support/rate-staff", { staffUserId: staffId, rating: 4, comment: "Nice" });
check("rating saved", r.status === 200, JSON.stringify(r.json));
r = await admin("GET", "/api/reborn/staff/leaderboard");
const row = r.json.find((x) => x.user_id === staffId);
check("leaderboard shows real name + rating", row && row.name === "Siti Rahma" && Number(row.rating) === 4 && Number(row.review_count) === 1, JSON.stringify(row));

// ---- payroll + payslip
const month = "2026-09";
r = await admin("POST", "/api/reborn/admin/payroll/profile", { userId: staffId, payType: "salary", employmentType: "full_time", baseSalary: 3000000, hourlyRate: 0, commissionRate: 2, salesTarget: 0, birthDate: "1992-02-02", residency: "citizen", statutoryOn: true, depositRequired: 0 });
check("payroll profile saved", r.status === 200, JSON.stringify(r.json));
r = await admin("GET", `/api/reborn/admin/payroll?month=${month}`);
const prow = r.json.staff.find((x) => x.user_id === staffId);
check("payroll lists staff with real name + position", prow && prow.name === "Siti Rahma" && prow.position_name === "Waiter" && prow.has_payslip === false, JSON.stringify(prow && { n: prow.name, p: prow.position_name, h: prow.has_payslip }));
check("a plain member is not in payroll", !r.json.staff.some((x) => x.user_id === memberId), "");
r = await admin("POST", "/api/reborn/admin/payroll/pay", { userId: staffId, name: "Siti Rahma", month, amount: 3100000, basic: 3000000, commission: 100000, overtime: 0, deduction: 50000, deductionNote: "late 3 times" });
check("pay recorded", r.status === 200, JSON.stringify(r.json)?.slice(0, 200));
r = await admin("GET", `/api/reborn/admin/payroll?month=${month}`);
check("payroll row now has a payslip", r.json.staff.find((x) => x.user_id === staffId)?.has_payslip === true, "");
r = await admin("POST", "/api/reborn/admin/payroll/pay", { userId: staffId, name: "x", month, amount: 3100000 });
check("same month can't be paid twice", r.status === 409, r.status);
r = await admin("GET", `/api/reborn/admin/payslips/${staffId}/${month}/pdf`);
check("admin downloads the payslip PDF", r.status === 200 && r.head === "%PDF-" && r.size > 1000, `${r.status} ${r.type} ${r.size}`);
r = await staff("GET", "/api/reborn/my-payslips");
check("staff sees the payslip in the app", r.status === 200 && r.json.length === 1 && r.json[0].month === month, JSON.stringify(r.json));
r = await staff("GET", `/api/reborn/my-payslips/${month}/pdf`);
check("staff downloads their PDF", r.status === 200 && r.head === "%PDF-", `${r.status} ${r.type}`);
r = await member("GET", `/api/reborn/my-payslips/${month}/pdf`);
check("a member can't read payslips", r.status === 401 || r.status === 403, r.status);

// ---- schedule
const days = [{ date: "2026-10-23", startTime: "16:00", endTime: "03:00" }, { date: "2026-10-24", startTime: "14:00", endTime: "23:00" }];
r = await admin("POST", "/api/reborn/admin/shifts", { userIds: [staffId], days });
check("two days with their own hours added", r.status === 200 && r.json.added === 2, JSON.stringify(r.json));
r = await admin("POST", "/api/reborn/admin/shifts", { userIds: [staffId], days });
check("repeat skips both", r.json.added === 0 && r.json.skipped === 2, JSON.stringify(r.json));
r = await admin("GET", "/api/reborn/admin/shifts?from=2026-10-01&to=2026-12-31");
const s1 = r.json.find((x) => x.shiftDate === "2026-10-24");
check("schedule lists them with the real name", r.json.length === 2 && s1?.startTime === "14:00" && s1?.staffName === "Siti Rahma", JSON.stringify(r.json));
r = await admin("PATCH", `/api/reborn/admin/shifts/${s1.id}`, { shiftDate: "2026-10-25", startTime: "15:00", endTime: "22:00" });
check("a shift's date and hours can be edited", r.status === 200 && r.json.shiftDate === "2026-10-25" && r.json.startTime === "15:00", JSON.stringify(r.json));
r = await staff("GET", "/api/reborn/staff/my-shifts");
check("worker sees the new date", r.json.some((x) => x.shiftDate === "2026-10-25"), JSON.stringify(r.json));
r = await staff("POST", "/api/reborn/admin/shifts", { userIds: [staffId], days });
check("plain staff can't schedule", r.status === 403 || r.status === 401, r.status);
await db.query("update bridge_company_members set role='manager' where user_id=$1", [staffId]);
r = await staff("POST", "/api/reborn/admin/shifts", { userIds: [staffId], days: [{ date: "2026-10-30", startTime: "10:00", endTime: "18:00" }] });
check("a manager can schedule", r.status === 200 && r.json.added === 1, `${r.status} ${JSON.stringify(r.json)}`);
await db.query("update bridge_company_members set role='staff' where user_id=$1", [staffId]);

// ---- contract draft + job scopes + ID upload by admin
r = await admin("PUT", `/api/reborn/admin/job-scopes/${position.id}`, { text: "Serve guests\nKeep tables clean" });
check("duties saved for the job", r.status === 200, JSON.stringify(r.json));
r = await admin("GET", "/api/reborn/admin/job-scopes");
check("saved duties read back", r.json[String(position.id)]?.includes("Serve guests"), JSON.stringify(r.json));
r = await admin("POST", `/api/reborn/admin/contracts/${staffId}/draft`, { jobTitle: "Waiter", startDate: "2026-11-01", lang: "id", jobScope: "Serve guests", extraTerms: "Rest day Monday" });
check("contract form saved as draft", r.status === 200 && r.json.saved === true, JSON.stringify(r.json));
r = await admin("GET", `/api/reborn/admin/contracts/${staffId}`);
check("draft is read back (still no contract)", r.json.jobTitle === "Waiter" && r.json.jobScope === "Serve guests" && r.json.status === "none" && r.json.lang === "id", JSON.stringify(r.json));
const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
r = await admin("POST", `/api/reborn/admin/contracts/${staffId}/id`, { image: png, idNumber: "3171-TEST" });
check("admin uploads the ID for the staff member", r.status === 200, JSON.stringify(r.json));
r = await admin("GET", `/api/reborn/admin/contracts/${staffId}/id`);
check("ID can be viewed by the admin", r.status === 200 && r.json.image?.startsWith("data:image/png"), r.status);
r = await member("GET", `/api/reborn/admin/contracts/${staffId}/id`);
check("a member can't view it", r.status === 401 || r.status === 403, r.status);
r = await admin("GET", `/api/reborn/admin/contracts/${staffId}`);
check("draft survived the ID upload", r.json.jobTitle === "Waiter" && r.json.hasId === true, JSON.stringify(r.json));
r = await admin("POST", `/api/reborn/admin/contracts/${staffId}/send`, { jobTitle: "Waiter", startDate: "2026-11-01", lang: "en", jobScope: "Serve guests\nKeep tables clean", extraTerms: "" });
check("contract sent with the job scope clause", r.status === 200, JSON.stringify(r.json));
r = await admin("GET", `/api/reborn/admin/contracts/${staffId}`);
check("sent contract has a Job scope clause + status", r.json.status === "awaiting_staff" && r.json.text?.clauses?.some((c) => c.heading === "Job scope"), JSON.stringify(r.json.text?.clauses?.map((c) => c.heading)));
r = await admin("POST", `/api/reborn/admin/contracts/${staffId}/draft`, { jobTitle: "Other" });
check("a sent contract isn't touched by the draft", r.json.saved === false, JSON.stringify(r.json));

console.log(failures ? `\n${failures} FAILED` : "\nALL PASSED");
await db.end();
