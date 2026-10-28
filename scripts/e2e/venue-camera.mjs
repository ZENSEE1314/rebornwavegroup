// Venue camera pictures: the venue PC sends them with the bridge token, staff see them in the Security tab. Run against the local test server (see README.md).
const BASE = "http://127.0.0.1:3999";
let failures = 0;
const makeClient = () => {
  let cookie = "";
  return async (method, path, body, headers = {}) => {
    const res = await fetch(BASE + path, { method, headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined, redirect: "manual" });
    const set = res.headers.getSetCookie?.() || []; if (set.length) cookie = set.map((c) => c.split(";")[0]).join("; ");
    const bytes = Buffer.from(await res.arrayBuffer()); let json = null; try { json = JSON.parse(bytes.toString("utf8")); } catch { /* not json */ }
    return { status: res.status, json, bytes, type: res.headers.get("content-type") || "" };
  };
};
const check = (name, ok, extra = "") => { console.log((ok ? "PASS " : "FAIL ") + name + (ok ? "" : "  → " + extra)); if (!ok) failures++; };

const jpeg = Buffer.from([0xff, 0xd8, 9, 8, 7, 0xff, 0xd9]).toString("base64");
const admin = makeClient();
await admin("POST", "/api/auth/login", { email: "admin@test.local", password: "Passw0rd!" });
const anon = makeClient();

const token = (await admin("POST", "/api/reborn/admin/karaoke/token")).json?.token;
check("the admin makes a bridge token", typeof token === "string" && token.length > 8, token);
const bridge = { "x-karaoke-token": token };

let r = await anon("POST", "/api/venue-camera/frame", { id: "door", name: "Door", jpeg });
check("a picture without the token is refused", r.status === 401, r.status);
r = await anon("POST", "/api/venue-camera/frame", { id: "door", name: "Door", jpeg }, { "x-karaoke-token": "wrong-token-value" });
check("a picture with a wrong token is refused", r.status === 401, r.status);
r = await anon("POST", "/api/venue-camera/frame", { id: "door", name: "Door", jpeg: Buffer.from("<html>").toString("base64") }, bridge);
check("something that is not a JPEG is refused", r.status === 400, r.status);
r = await anon("POST", "/api/venue-camera/frame", { id: "door", name: "Front door", jpeg }, bridge);
check("the venue PC's picture is accepted and nobody is watching yet", r.status === 200 && r.json?.watching === false, JSON.stringify(r.json));

r = await anon("GET", "/api/reborn/security/venue-cameras");
check("a visitor cannot list the cameras", r.status === 401 || r.status === 403, r.status);
r = await anon("GET", "/api/reborn/security/venue-cameras/door.jpg");
check("a visitor cannot see a picture", r.status === 401 || r.status === 403, r.status);

r = await admin("GET", "/api/reborn/security/venue-cameras");
check("staff see the camera by name", r.status === 200 && r.json.cameras.some((c) => c.id === "door" && c.name === "Front door"), JSON.stringify(r.json));
r = await admin("GET", "/api/reborn/security/venue-cameras/door.jpg");
check("staff get the picture itself", r.status === 200 && r.type.startsWith("image/jpeg") && r.bytes[0] === 0xff && r.bytes[1] === 0xd8, `${r.status} ${r.type}`);
r = await admin("GET", "/api/reborn/security/venue-cameras/nope.jpg");
check("an unknown camera is 404", r.status === 404, r.status);

r = await anon("POST", "/api/venue-camera/frame", { id: "door", name: "Front door", jpeg }, bridge);
check("after staff looked, the venue PC is told someone is watching", r.status === 200 && r.json?.watching === true, JSON.stringify(r.json));

console.log(failures ? `FAILED: ${failures}` : "ALL PASSED");
process.exit(failures ? 1 : 0);
