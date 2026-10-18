const net = require("net"); const http = require("http");
const probe = (ip, port) => new Promise((resolve) => { const s = net.connect({ host: ip, port, timeout: 800 }); s.on("connect", () => { s.destroy(); resolve(true); }); s.on("timeout", () => { s.destroy(); resolve(false); }); s.on("error", () => resolve(false)); });
const get = (url) => new Promise((resolve) => { const r = http.get(url, { timeout: 2000 }, (res) => { let b = ""; res.on("data", (d) => (b += d)); res.on("end", () => resolve(b)); }); r.on("error", () => resolve("")); r.on("timeout", () => { r.destroy(); resolve(""); }); });
(async () => {
  for (const ip of ["192.168.100.33", "192.168.100.69", "192.168.100.57", "192.168.100.72", "192.168.100.4"]) {
    const ports = [8008, 8009, 8443, 5555, 7000, 7100, 80, 8080, 8060, 9000, 36866, 6466, 6467, 1900];
    const open = (await Promise.all(ports.map(async (p) => ((await probe(ip, p)) ? p : null)))).filter(Boolean);
    let info = "";
    if (open.includes(8008)) { const j = await get(`http://${ip}:8008/setup/eureka_info?options=detail`); try { const d = JSON.parse(j); info = ` name=${d.name} model=${d.detail?.model_name || d.model_name || ""} maker=${d.detail?.manufacturer || ""} build=${d.build_version || ""}`; } catch { info = " (8008 open, no eureka info)"; } }
    console.log(ip, "open:", open.join(",") || "none", info);
  }
})();
