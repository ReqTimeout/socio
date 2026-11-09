/**
 * seo/lib/gsc.mjs — Google Search Console client untuk SEO runner socio.id.
 *
 * ZERO DEPENDENCY (node:crypto + global fetch, Node >= 18) — image runner
 * `node:22-slim` tidak perlu `googleapis`, jadi `pnpm install` tidak pernah
 * gagal karena lockfile.
 *
 * Runbook + status terverifikasi: docs/GOOGLE_CLOUD_SETUP.md
 * Pemakaian: seo/gsc-inspect.mjs, seo/ramp-gate.mjs, seo/distribute/*.mjs
 *
 * WAJIB: GSC_SITE_URL = `sc-domain:socio.id` (domain property). URL prefix
 * (`https://socio.id/`) → 403 "You do not own this site".
 *
 * Scope: webmasters (inspect + search analytics) DAN indexing (Indexing API).
 * Kalau hanya webmasters, Indexing API balas ACCESS_TOKEN_SCOPE_INSUFFICIENT.
 */

import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createSign, generateKeyPairSync } from 'node:crypto';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SC_API = 'https://searchconsole.googleapis.com';
const SC_WEBMASTER = 'https://www.googleapis.com';
const INDEXING_API = 'https://indexing.googleapis.com';

export const SCOPE_WEBMASTER = 'https://www.googleapis.com/auth/webmasters';
export const SCOPE_INDEXING = 'https://www.googleapis.com/auth/indexing';

const SCOPES = [SCOPE_WEBMASTER, SCOPE_INDEXING];

/** Site property. Jangan hardcode URL prefix — selalu domain property. */
export const SITE_URL = process.env.GSC_SITE_URL || 'sc-domain:socio.id';

const b64url = (input) => Buffer.from(input).toString('base64url');

/**
 * Sumber kredensial, urutan prioritas:
 *   1. GSC_SERVICE_ACCOUNT_GZIP_B64URL — 2.263 char, untuk env manager yang
 *      memotong string panjang (>~2.500 char terbukti merusak JSON).
 *   2. GSC_SERVICE_ACCOUNT_JSON_B64    — 3.184 char, canonical untuk Coolify.
 *   3. GSC_SA_FILE                     — path file JSON, dev lokal (tanpa
 *      menyalin private key ke .env).
 *   4. GSC_SERVICE_ACCOUNT_JSON        — back-compat, JSON dengan \n escaped.
 * @returns {Record<string, unknown>} parsed service account JSON
 */
export function loadCreds() {
  if (process.env.GSC_SERVICE_ACCOUNT_GZIP_B64URL) {
    return JSON.parse(gunzipSync(Buffer.from(process.env.GSC_SERVICE_ACCOUNT_GZIP_B64URL, 'base64url')).toString('utf8'));
  }
  if (process.env.GSC_SERVICE_ACCOUNT_JSON_B64) {
    return JSON.parse(Buffer.from(process.env.GSC_SERVICE_ACCOUNT_JSON_B64, 'base64').toString('utf8'));
  }
  if (process.env.GSC_SA_FILE) {
    return JSON.parse(readFileSync(process.env.GSC_SA_FILE, 'utf8'));
  }
  if (process.env.GSC_SERVICE_ACCOUNT_JSON) {
    return JSON.parse(process.env.GSC_SERVICE_ACCOUNT_JSON.replace(/\\n/g, '\n'));
  }
  throw new Error(
    'GSC credentials not found. Set GSC_SERVICE_ACCOUNT_JSON_B64 (prod) atau GSC_SA_FILE (dev). Lihat docs/GOOGLE_CLOUD_SETUP.md §3'
  );
}

/**
 * Cache token per proses — token access Google valid 1 jam, jadi batch 50 URL
 * cukup 1 sign.
 *
 * WAJIB cek masa berlaku: kalau token dipakai tanpa cek `expires_in`, proses
 * yang jalan >1 jam (batch URL Inspection 1.000 URL ≈ 1-2 jam) mulai HTTP 401
 * "Request had invalid authentication credential" di URL terakhir — symptomnya
 * inspeksi gagal total padahal kredensialnya valid.
 */
let tokenCache = null;
/** Segarkan 60 detik sebelum token benar-benar expired. */
const TOKEN_EXPIRY_SKEW_MS = 60_000;

function signJwt(creds, scopes) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({ iss: creds.client_email, scope: scopes.join(' '), aud: TOKEN_URL, iat: now, exp: now + 3600 })
  );
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  return `${header}.${claims}.${signer.sign(creds.private_key, 'base64url')}`;
}

/**
 * Exchange JWT → access token.
 * @param {{scopes?: string[], force?: boolean}} [opts]
 * @returns {Promise<string>}
 */
export async function getToken(opts = {}) {
  const scopes = opts.scopes?.length ? opts.scopes : SCOPES;
  const scopeKey = scopes.join(' ');
  const masihValid =
    tokenCache && tokenCache.scopes === scopeKey && Date.now() < tokenCache.expiresAt - TOKEN_EXPIRY_SKEW_MS;
  if (masihValid && !opts.force) {
    return tokenCache.token;
  }
  const creds = loadCreds();
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: signJwt(creds, scopes),
    }),
  });
  const data = await res.json();
  if (!data.access_token) {
    throw new Error(`token exchange failed (HTTP ${res.status}): ${data.error_description || data.error}`);
  }
  tokenCache = {
    token: data.access_token,
    scopes: scopeKey,
    expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
  };
  return data.access_token;
}

async function gscFetch(path, { method = 'GET', body, base = SC_API, token } = {}) {
  const send = async (bearer) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${bearer}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text.slice(0, 200) };
    }
    return { status: res.status, json };
  };

  let res = await send(token || (await getToken()));
  if (res.status === 401 && !token) {
    // Token kedaluwarsa / dicabut → tukar token baru lalu coba lagi SATU KALI.
    res = await send(await getToken({ force: true }));
  }
  return res;
}

/** Property GSC yang bisa diakses SA ini. */
export async function listSites() {
  const res = await gscFetch('/webmasters/v3/sites', { base: SC_WEBMASTER });
  if (res.status !== 200) throw new Error(`sites.list HTTP ${res.status}: ${JSON.stringify(res.json).slice(0, 200)}`);
  return (res.json.siteEntry || []).map((s) => s.siteUrl);
}

/**
 * URL Inspection untuk 1 URL.
 * @param {string} inspectionUrl URL absolut dengan trailing slash (canonical)
 * @param {{siteUrl?: string, languageCode?: string}} [opts]
 */
export async function inspectUrl(inspectionUrl, opts = {}) {
  const res = await gscFetch('/v1/urlInspection/index:inspect', {
    method: 'POST',
    body: { inspectionUrl, siteUrl: opts.siteUrl || SITE_URL, languageCode: opts.languageCode || 'en-US' },
  });
  if (res.status !== 200) {
    throw new Error(`inspectUrl(${inspectionUrl}) HTTP ${res.status}: ${res.json?.error?.message || JSON.stringify(res.json).slice(0, 160)}`);
  }
  return res.json.inspectionResult?.indexStatusResult || null;
}

/** Bentuk ringkas untuk disimpan ke `state.json`. */
export function toStateEntry(status) {
  if (!status) return null;
  return {
    verdict: status.verdict,
    coverageState: status.coverageState,
    indexingState: status.indexingState,
    robotsTxtState: status.robotsTxtState,
    lastCrawlTime: status.lastCrawlTime,
    pageFetchState: status.pageFetchState,
    crawledAs: status.crawledAs,
    userCanonical: status.userCanonical,
  };
}

/** True kalau URL benar-benar ada di indeks Google. */
export function isIndexed(entry) {
  if (!entry) return false;
  if (entry.verdict !== 'PASS') return false;
  const s = String(entry.coverageState || '');
  return /indexed/i.test(s) && !/not indexed|excluded|blocked|error/i.test(s);
}

/**
 * Search Analytics (mining query mingguan).
 * @param {{days?: number, dimensions?: string[], rowLimit?: number, startDate?: string, endDate?: string}} [opts]
 */
export async function searchAnalytics(opts = {}) {
  const end = opts.endDate ? new Date(`${opts.endDate}T00:00:00Z`) : new Date();
  const start = opts.startDate
    ? new Date(`${opts.startDate}T00:00:00Z`)
    : new Date(end.getTime() - (opts.days ?? 28) * 86400000);
  const site = encodeURIComponent(opts.siteUrl || SITE_URL);
  const res = await gscFetch(`/webmasters/v3/sites/${site}/searchAnalytics/query`, {
    method: 'POST',
    base: SC_WEBMASTER,
    body: {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      dimensions: opts.dimensions || ['query'],
      rowLimit: opts.rowLimit || 50,
    },
  });
  if (res.status !== 200) {
    throw new Error(`searchAnalytics HTTP ${res.status}: ${res.json?.error?.message || JSON.stringify(res.json).slice(0, 160)}`);
  }
  return res.json.rows || [];
}

/** Sitemap yang terdaftar di GSC + last read. */
export async function listSitemaps() {
  const site = encodeURIComponent(SITE_URL);
  const res = await gscFetch(`/webmasters/v3/sites/${site}/sitemaps`, { base: SC_WEBMASTER });
  if (res.status !== 200) return [];
  return res.json.sitemap || [];
}

/**
 * Submit sitemap (atau register sitemap baru) ke GSC.
 * Endpoint yang BENAR: `PUT /webmasters/v3/sites/{site}/sitemaps/{feedpath}`
 * — TANPA suffix `/submit` (dengan suffix balasan 404 HTML dari Google).
 * Balasan sukses = 204. Setelah itu `listSitemaps()` akan muncul dengan
 * `isPending: true` sampai Google selesai membaca.
 */
export async function submitSitemap(sitemapUrl) {
  const site = encodeURIComponent(SITE_URL);
  const url = sitemapUrl || process.env.GSC_SITEMAP_URL || 'https://socio.id/sitemap-index.xml';
  const res = await gscFetch(`/webmasters/v3/sites/${site}/sitemaps/${encodeURIComponent(url)}`, {
    method: 'PUT',
    base: SC_WEBMASTER,
  });
  return res.status === 204 || res.status === 200;
}

/** Hapus entri sitemap dari GSC (dipakai untuk bersihkan sitemap mati). */
export async function deleteSitemap(sitemapUrl) {
  const site = encodeURIComponent(SITE_URL);
  const res = await gscFetch(`/webmasters/v3/sites/${site}/sitemaps/${encodeURIComponent(sitemapUrl)}`, {
    method: 'DELETE',
    base: SC_WEBMASTER,
  });
  return res.status === 204 || res.status === 200;
}

/** Detail 1 sitemap terdaftar (lastSubmitted, isPending, errors). */
export async function getSitemap(sitemapUrl) {
  const site = encodeURIComponent(SITE_URL);
  const res = await gscFetch(`/webmasters/v3/sites/${site}/sitemaps/${encodeURIComponent(sitemapUrl)}`, {
    base: SC_WEBMASTER,
  });
  return res.status === 200 ? res.json : null;
}

/**
 * Indexing API — PUBLISH notifikasi. HATI-HATI: Google resmi hanya menganggap
 * Indexing API valid untuk JobPosting / BroadcastEvent. Untuk artikel blog
 * efeknya tidak dijamin → pakai hanya emergency submit, bukan primary indexer.
 * @param {string} url
 * @param {'URL_UPDATED'|'URL_DELETED'} [type]
 */
export async function publishIndexing(url, type = 'URL_UPDATED') {
  const res = await gscFetch('/v3/urlNotifications:publish', {
    method: 'POST',
    base: INDEXING_API,
    body: { url, type },
  });
  return { status: res.status, ok: res.status === 200, result: res.json };
}

/** Rate-limit helper: 1 request / 200ms (anti quota-exceeded). */
export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── self-test: masa berlaku token + retry 401 ───────────────────────────────
// Regresi produksi (8 Nov 2026): cache token tidak pernah cek masa berlaku →
// proses >1 jam memakai token expired → 447 URL gagal "invalid authentication
// credential". Semua diuji di sini tanpa memanggil API sungguhan.
//
//   node seo/lib/gsc.mjs --self-test
if (process.argv.includes('--self-test')) {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });

  const fetchAsli = globalThis.fetch;
  const kredensial = { client_email: 'selftest@example.com', private_key: privateKey };
  let tukar = 0; // jumlah pertukaran token
  let ttl = 3600; // expires_in untuk pertukaran berikutnya
  let sisa401 = 0; // jumlah respons 401 yang harus memicu retry

  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes('oauth2.googleapis.com/token')) {
      tukar += 1;
      return new Response(JSON.stringify({ access_token: `tok-${tukar}`, expires_in: ttl }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (sisa401 > 0) {
      sisa401 -= 1;
      return new Response(
        JSON.stringify({ error: { message: 'Request had invalid authentication credential' } }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }
    return new Response(JSON.stringify({ inspectionResult: { indexStatusResult: { verdict: 'PASS' } } }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  process.env.GSC_SERVICE_ACCOUNT_JSON_B64 = Buffer.from(JSON.stringify(kredensial)).toString('base64');

  let lulus = 0;
  let gagal = 0;
  const cek = (nama, ok, detail = '') => {
    if (ok) {
      lulus++;
      console.log(`  ✓ ${nama}${detail ? ` → ${detail}` : ''}`);
    } else {
      gagal++;
      console.log(`  ✗ ${nama}${detail ? ` → ${detail}` : ''}`);
    }
  };

  try {
    const t1 = await getToken();
    const t2 = await getToken();
    cek('cache hit tidak menukar token ulang', t1 === t2 && tukar === 1, `tukar=${tukar}`);

    const t3 = await getToken({ force: true });
    cek('force refresh menukar token baru', t3 !== t1 && tukar === 2, `tukar=${tukar}`);

    // Token berumur pendek → panggilan berikutnya WAJIB menukar baru.
    // Inilah regresi yang bikin 447 URL gagal 401 di produksi.
    ttl = 1;
    const t4 = await getToken({ force: true });
    const t5 = await getToken();
    cek('token kedaluwarsa langsung ditukar lagi', t5 !== t4 && tukar === 4, `tukar=${tukar}`);

    // 401 dari API → retry satu kali dengan token baru.
    ttl = 3600;
    await getToken({ force: true });
    const sebelum = tukar;
    sisa401 = 1;
    const status = await inspectUrl('https://socio.id/blog/selftest/');
    cek('401 di-retri dengan token baru', status?.verdict === 'PASS' && tukar === sebelum + 1, `tukar=${tukar}`);
  } catch (err) {
    cek('self-test tidak melempar error', false, String(err?.message || err));
  } finally {
    globalThis.fetch = fetchAsli;
    delete process.env.GSC_SERVICE_ACCOUNT_JSON_B64;
  }

  console.log(`\n  self-test: ${lulus} lulus, ${gagal} gagal`);
  process.exitCode = gagal ? 1 : 0;
}
