#!/usr/bin/env node
/**
 * runner/daily.mjs — pipeline harian SEO engine socio.id (06:00 WIB).
 *
 * Tahap:
 *   0. lock anti double-run (runner/lib/lock.mjs)
 *   1. seo/indexer.mjs → indexnow → bing-submit → gsc-inspect → remedy → ramp-gate
 *   2. ringkasan + email (runner/lib/notify.mjs)
 *
 * Publish (flip draft → build landing → deploy Cloudflare Pages) **belum** aktif:
 * butuh repo konten terpisah + kredensial CF (lihat `docs/SEO_AUTOMATION_PLAN_V2.md`
 * §14.2 item 3.2 dan `docs/COOLIFY_SEO_PROJECT.md` §6). Bukan karena lupa —
 * dijalankan sebagai no-op yang eksplisit supaya tidak ada publish diam-diam.
 *
 * Env: SEO_STATE_PATH · SEO_CONFIG_PATH · GSC_* · BING_API_KEY ·
 *      RESEND_API_KEY · NOTIFY_EMAIL_TO · NOTIFY_EMAIL_FROM · SEO_SKIP_INDEXER=1
 * Exit: 0 = aman, 1 = gagal (tahap wajib indexer).
 */

import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { acquireLock } from './lib/lock.mjs';
import { sendReport } from './lib/notify.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const STATE = process.env.SEO_STATE_PATH || join(ROOT, 'seo/state.json');

const log = (m) => console.log(`[daily] ${m}`);

function readState() {
  try {
    return JSON.parse(readFileSync(STATE, 'utf8'));
  } catch {
    return {};
  }
}

function run(script, args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(ROOT, script), ...args], {
      stdio: ['ignore', 'inherit', 'inherit'],
      env: process.env,
    });
    child.on('error', (e) => resolve({ code: 1, error: e.message }));
    child.on('close', (code) => resolve({ code: code ?? 1 }));
  });
}

/** Ringkasan angka untuk email + keputusan ramp. */
function buildSummary(state) {
  const published = state.published || [];
  const insp = state.gsc?.inspections || {};
  const last = state.gsc?.lastRun || {};
  const labels = published.reduce((acc, p) => {
    const l = p.indexed || 'unknown';
    acc[l] = (acc[l] || 0) + 1;
    return acc;
  }, {});
  const discovered = (labels.indexed || 0) + (labels.not_indexed || 0) + (labels.blocked || 0);
  const rate = discovered ? (labels.indexed || 0) / discovered : null;
  return {
    total: published.length,
    labels,
    indexRate: rate,
    discoveryGap: (labels.not_discovered || 0) + (labels.unknown || 0),
    lastInspect: last.at || null,
    bing: state.bing?.lastRun || null,
    alerts: [state.rampGate?.alert, state.remedyAlert].filter(Boolean),
    indexer: state.indexer?.lastRun || null,
    dailyCount: null,
  };
}

async function main() {
  log(`start ${new Date().toISOString()}`);
  if (!existsSync(STATE)) {
    console.error(`FATAL: state.json tidak ada di ${STATE}`);
    return 1;
  }

  const lock = await acquireLock('daily');
  if (!lock.acquired) {
    log(`SKIP — masih ada run lain (pid ${lock.holder?.pid} di ${lock.holder?.host}, mulai ${lock.holder?.at})`);
    return 0;
  }
  log(`lock diambil (pid ${process.pid})`);

  let indexerCode = 0;
  try {
    if (process.env.SEO_SKIP_INDEXER === '1') {
      log('SEO_SKIP_INDEXER=1 — tahap indexer dilewati (untuk uji notify/lock saja)');
    } else {
      log('jalan: seo/indexer.mjs');
      const r = await run('seo/indexer.mjs', []);
      indexerCode = r.code;
      log(`indexer selesai exit=${r.code}`);
    }

    const state = readState();
    const s = buildSummary(state);

    log('publish: belum aktif (butuh repo konten + kredensial CF) — no-op eksplisit');

    const rateText = s.indexRate === null ? 'n/a' : `${(s.indexRate * 100).toFixed(1)}%`;
    const lines = [
      `URL published: ${s.total}`,
      `label: indexed ${s.labels.indexed || 0} · not_indexed ${s.labels.not_indexed || 0} · not_discovered ${s.labels.not_discovered || 0} · blocked ${s.labels.blocked || 0} · unknown ${s.labels.unknown || 0}`,
      `index_rate (indexed/discovered): ${rateText}`,
      `Bing: ${s.bing ? `submit ${s.bing.submitted} URL, kuota ${s.bing.quotaAfter}/${s.bing.quotaBefore}` : 'belum ada run'}`,
      `inspeksi GSC terakhir: ${s.lastInspect || 'belum'}`,
      `indexer: ${s.indexer ? s.indexer.stages.map((x) => `${x.name}=${x.status}`).join(' ') : 'belum ada run'}`,
    ];

    await sendReport({
      subject: `[socio-seo] harian ${new Date().toISOString().slice(0, 10)} — index_rate ${rateText}${indexerCode === 0 ? '' : ' (INDEXER GAGAL)'}`,
      heading: 'SEO engine socio.id — laporan harian',
      lines,
      alerts: s.alerts,
    });

    if (indexerCode !== 0) {
      log('indexer gagal → publish TIDAK dijalankan (fail-closed)');
    }
    return indexerCode;
  } finally {
    lock.release();
    log('lock dilepas');
  }
}

main()
  .then((code) => {
    log(`exit ${code}`);
    process.exitCode = code;
  })
  .catch((e) => {
    console.error(`FATAL: ${e.message}`);
    process.exitCode = 1;
  });
