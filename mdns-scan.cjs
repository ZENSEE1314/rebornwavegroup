const dgram = require("dgram"); const os = require("os");
const mine = [];
for (const list of Object.values(os.networkInterfaces())) for (const n of list || []) if (n.family === "IPv4" && !n.internal && n.address.startsWith("192.168.100")) mine.push(n.address);
const enc = (name) => Buffer.concat([...name.split(".").map((l) => Buffer.concat([Buffer.from([l.length]), Buffer.from(l)])), Buffer.from([0])]);
const query = (names) => { const hdr = Buffer.alloc(12); hdr.writeUInt16BE(names.length, 4); return Buffer.concat([hdr, ...names.flatMap((n) => [enc(n), Buffer.from([0, 12, 0, 1])])]); };
const readName = (buf, off) => { const labels = []; let jumped = false, end = off; for (let g = 0; g < 40; g++) { const len = buf[off]; if (len === undefined) break; if (len === 0) { if (!jumped) end = off + 1; break; } if ((len & 0xc0) === 0xc0) { if (!jumped) end = off + 2; off = ((len & 0x3f) << 8) | buf[off + 1]; jumped = true; continue; } labels.push(buf.slice(off + 1, off + 1 + len).toString()); off += len + 1; } return [labels.join("."), end]; };
const seen = new Map();
const parse = (buf, from) => { try { let off = 12; const qd = buf.readUInt16BE(4), an = buf.readUInt16BE(6), ns = buf.readUInt16BE(8), ar = buf.readUInt16BE(10); for (let i = 0; i < qd; i++) { off = readName(buf, off)[1] + 4; }
  for (let i = 0; i < an + ns + ar; i++) { const [name, o] = readName(buf, off); const type = buf.readUInt16BE(o); const rdlen = buf.readUInt16BE(o + 8); const rd = o + 10; let text = ""; if (type === 12) text = readName(buf, rd)[0]; else if (type === 1) text = [...buf.slice(rd, rd + 4)].join("."); else if (type === 33) text = readName(buf, rd + 6)[0]; else if (type === 16) { let p = rd; const parts = []; while (p < rd + rdlen) { const l = buf[p]; parts.push(buf.slice(p + 1, p + 1 + l).toString()); p += l + 1; } text = parts.filter((x) => /fn=|md=|model|name|friendly|deviceid|manufacturer/i.test(x)).join("; "); } off = rd + rdlen; if (text) { const e = seen.get(from) || new Set(); e.add(`${type === 12 ? "PTR" : type === 1 ? "A" : type === 33 ? "SRV" : "TXT"} ${name} ${text}`); seen.set(from, e); } } } catch {} };
(async () => {
  for (const addr of mine) await new Promise((resolve) => {
    const s = dgram.createSocket({ type: "udp4", reuseAddr: true });
    s.on("message", (m, r) => parse(m, r.address));
    s.bind(5353, addr, () => { try { s.addMembership("224.0.0.251", addr); } catch {} ; const services = ["_services._dns-sd._udp.local", "_googlecast._tcp.local", "_airplay._tcp.local", "_samsungmsf._tcp.local", "_spotify-connect._tcp.local", "_http._tcp.local", "_companion-link._tcp.local", "_raop._tcp.local", "_lgsmarttv._tcp.local", "_androidtvremote2._tcp.local", "_viziocast._tcp.local", "_dial._tcp.local"];
      for (const n of services) s.send(query([n]), 5353, "224.0.0.251"); setTimeout(() => { s.send(query(services.slice(0, 6)), 5353, "224.0.0.251"); }, 1500); setTimeout(() => { s.close(); resolve(); }, 6000); });
  });
  console.log("devices that answered mDNS:", seen.size);
  for (const [ip, set] of [...seen].sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))) { console.log("\n" + ip); for (const line of [...set].slice(0, 12)) console.log("   " + line.slice(0, 150)); }
})();
