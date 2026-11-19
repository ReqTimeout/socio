// Socio Whitelabel Starter Panel — Node.js single-file (tanpa dependensi).
// Jalankan: SOCIO_API_KEY=key_kamu node panel.mjs   → http://localhost:8080
// White-label: set PANEL_NAME / PANEL_ACCENT di bawah atau via env. API key tetap
// di server (tidak pernah terekspos ke browser); browser bicara ke proxy ini.

import { createServer } from "node:http";

const API_KEY = process.env.SOCIO_API_KEY ?? "";
const API_BASE = (process.env.SOCIO_API_BASE ?? "https://app.socio.id/api/v1").replace(/\/$/, "");
const PORT = Number(process.env.PORT ?? 8080);
const PANEL_NAME = process.env.PANEL_NAME ?? "My SMM Panel";
const PANEL_ACCENT = process.env.PANEL_ACCENT ?? "#4f46e5";

if (!API_KEY) {
  console.error("Set env SOCIO_API_KEY (key Reseller/Agen dari app.socio.id).");
  process.exit(1);
}

async function callSocio(action, params = {}) {
  const body = new URLSearchParams({ key: API_KEY, action, ...params });
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return res.json();
}

const HTML = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${PANEL_NAME}</title>
<style>
  :root { --accent: ${PANEL_ACCENT}; }
  * { box-sizing: border-box; }
  body { font-family: system-ui, sans-serif; margin: 0; background: #f6f7f9; color: #111; }
  header { background: var(--accent); color: #fff; padding: 16px 20px; font-weight: 700; }
  main { max-width: 760px; margin: 20px auto; padding: 0 16px; display: grid; gap: 16px; }
  .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
  h2 { font-size: 14px; margin: 0 0 12px; text-transform: uppercase; letter-spacing: .04em; color: #555; }
  label { display: block; font-size: 12px; margin: 8px 0 4px; color: #444; }
  input, select, button { width: 100%; padding: 9px 10px; border-radius: 8px; border: 1px solid #d1d5db; font-size: 14px; }
  button { background: var(--accent); color: #fff; border: 0; cursor: pointer; margin-top: 12px; font-weight: 600; }
  .balance { font-size: 28px; font-weight: 800; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #eee; }
  pre { background: #0f172a; color: #e2e8f0; padding: 10px; border-radius: 8px; overflow: auto; font-size: 12px; }
  .muted { color: #777; font-size: 12px; }
</style>
</head>
<body>
<header>${PANEL_NAME}</header>
<main>
  <div class="card">
    <h2>Saldo</h2>
    <div class="balance" id="balance">—</div>
    <div class="muted" id="currency"></div>
  </div>

  <div class="card">
    <h2>Order baru</h2>
    <label>Layanan</label>
    <select id="service"></select>
    <label>Link</label>
    <input id="link" placeholder="https://..." />
    <label>Jumlah</label>
    <input id="quantity" type="number" placeholder="1000" />
    <button id="place">Buat order</button>
    <pre id="addResult" hidden></pre>
  </div>

  <div class="card">
    <h2>Cek status</h2>
    <label>Order ID</label>
    <input id="orderId" placeholder="123456" />
    <button id="check">Cek</button>
    <pre id="statusResult" hidden></pre>
  </div>

  <div class="card">
    <h2>Order terbaru</h2>
    <button id="loadOrders">Muat riwayat</button>
    <table id="ordersTable"><thead><tr><th>Order</th><th>Layanan</th><th>Status</th><th>Biaya</th></tr></thead><tbody></tbody></table>
  </div>
</main>
<script>
  const $ = (id) => document.getElementById(id);
  async function api(action, params = {}) {
    const res = await fetch("/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...params }),
    });
    return res.json();
  }
  function show(el, data) { el.hidden = false; el.textContent = JSON.stringify(data, null, 2); }

  async function loadBalance() {
    const b = await api("balance");
    $("balance").textContent = b.error ? b.error : b.balance;
    $("currency").textContent = b.currency ?? "";
  }
  async function loadServices() {
    const s = await api("services");
    const sel = $("service");
    sel.innerHTML = "";
    if (Array.isArray(s)) {
      for (const svc of s) {
        const o = document.createElement("option");
        o.value = svc.service;
        o.textContent = svc.service + " — " + svc.name + " (harga " + svc.rate + ", min " + svc.min + ")";
        sel.appendChild(o);
      }
    } else { show($("addResult"), s); }
  }
  $("place").onclick = async () => {
    const r = await api("add", { service: $("service").value, link: $("link").value, quantity: $("quantity").value });
    show($("addResult"), r);
    if (r.order) { $("orderId").value = r.order; loadBalance(); }
  };
  $("check").onclick = async () => show($("statusResult"), await api("status", { order: $("orderId").value }));
  $("loadOrders").onclick = async () => {
    const rows = await api("orders", { limit: 20 });
    const tb = $("ordersTable").querySelector("tbody");
    tb.innerHTML = "";
    if (Array.isArray(rows)) {
      for (const o of rows) {
        const tr = document.createElement("tr");
        tr.innerHTML = "<td>" + o.order + "</td><td>" + (o.service ?? "") + "</td><td>" + o.status + "</td><td>" + (o.charge ?? "") + "</td>";
        tb.appendChild(tr);
      }
    }
  };
  loadBalance(); loadServices();
</script>
</body>
</html>`;

const server = createServer(async (req, res) => {
  if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(HTML);
    return;
  }
  if (req.method === "POST" && req.url === "/api") {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    try {
      const { action, ...params } = JSON.parse(raw || "{}");
      if (!action) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Action wajib diisi" }));
        return;
      }
      const clean = {};
      for (const [k, v] of Object.entries(params)) {
        if (v !== null && v !== undefined && v !== "") clean[k] = String(v);
      }
      const data = await callSocio(String(action), clean);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(data));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(e?.message ?? e) }));
    }
    return;
  }
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Tidak ditemukan");
});

server.listen(PORT, () => {
  console.log(`${PANEL_NAME} (whitelabel starter) → http://localhost:${PORT}`);
  console.log(`API Socio upstream: ${API_BASE}`);
});
