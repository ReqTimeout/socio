#!/usr/bin/env node
/**
 * seo/seo-status.mjs — ringkasan HARIAN pipeline SEO socio.id + alert.
 *
 * Plan §10.5: ringkas ke laporan harian — publish hari ini, index_rate,
 * discovered vs indexed, kuota Bing, runway draft. Alert bila:
 *   index_rate < 0.40 · kuota Bing < 10% · runway < 7 hari · publish gagal 2×.
 *
 * Dibaca dari:
 *   - state.json  → published, gsc.inspections, bing, rampGate, indexer
 *   - config.json → daily_count, min/max, halt, bings_quota_reserve
 *   - queue.json  → kiraan pending/draft/published (runway)
 *
 * PORT dari socio.my (repo/seo/seo-status.mjs) — adaptasi untuk socio.id:
 *   - OUTPUT ke `${SEO_REPORT_DIR}/SEO-DAILY.md` (UNTRACKED). Di .my laporan
 *     ditulis ke `docs/SEO-DAILY.md` yang tracked → tree jadi dirty setiap
 *     hari → `git pull --rebase` siklus publish gagal (insiden 3-8 Nov 2026).
 *   - `publishedToday` dihitung dari `state.published[].firstSeen` (jalur
 *     publish produksi tidak menulis `state.publishedToday`), dengan fallback
 *     ke catatan `published <tanggal>` di queue.
 *   - Exit 0 secara default supaya siklus cron tidak Putus; `--strict`
 *     mengembalikan exit 1 bila ada alert kritikal (untuk monitoring).
 *
 * Usage: node seo/seo-status.mjs [--json] [--quiet] [--strict]
 * Env: SEO_REPORT_DIR (default /app/data/reports di container, sonst <repo>/seo/reports)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { STATE_PATH, CONFIG_PATH, QUEUE_PATH } from "./paths.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const JSON_OUT = process.argv.includes("--json");
const QUIET = process.argv.includes("--quiet");
const STRICT = process.argv.includes("--strict");

const REPORT_DIR =
  process.env.SEO_REPORT_DIR ||
  (existsSync("/app/data")
    ? "/app/data/reports"
    : join(ROOT, "seo", "reports"));
const OUT_MD = join(REPORT_DIR, "SEO-DAILY.md");

const MONTHLY_BING_TOTAL = 3100;
const DAILY_BING_TOTAL = 100;

const readJson = (p, fallback = null) => {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
};

/**
 * Klas bucket GSC — SAMA dengan seo/ramp-gate.mjs (labelFrom) supaya dua
 * laporan tidak berbeza: "Submitted and indexed" → indexed; "URL is unknown
 * to Google" → not_discovered; "*. currently not indexed" → not_indexed.
 * index_rate = indexed / (indexed + not_indexed + blocked) — not_discovered
 * dikecualikan (itu isu discovery, bukan isu indexing).
 */
function bucketCounts(state) {
  const insp = state?.gsc?.inspections || {};
  const counts = {
    indexed: 0,
    not_indexed: 0,
    not_discovered: 0,
    blocked: 0,
    unknown: 0,
  };
  for (const v of Object.values(insp)) {
    const coverage = String(v?.coverageState || "");
    if (v?.robotsTxtState === "DISALLOWED") {
      counts.blocked++;
      continue;
    }
    if (
      v?.verdict === "PASS" &&
      /indexed/i.test(coverage) &&
      !/not indexed/i.test(coverage)
    ) {
      counts.indexed++;
    } else if (/excluded|blocked/i.test(coverage)) counts.blocked++;
    else if (/unknown to Google/i.test(coverage)) counts.not_discovered++;
    else if (/not indexed/i.test(coverage)) counts.not_indexed++;
    else counts.unknown++;
  }
  return counts;
}

function queueCounts() {
  const q = readJson(QUEUE_PATH, { items: [] });
  const items = Array.isArray(q) ? q : q.items || [];
  const c = { pending: 0, draft: 0, published: 0, dropped: 0, quarantined: 0 };
  for (const it of items) {
    const s = it.status || "?";
    if (s in c) c[s]++;
    else c[s] = (c[s] || 0) + 1;
  }
  return c;
}

/**
 * Jumlah artikel yang publish hari ini. Jalur publish produksi (publish-git)
 * tidak menulis `state.publishedToday`, jadi hitung dari `firstSeen` entri
 * state; fallback ke catatan `published <tanggal>` pada queue.
 */
function publishedTodayCount(state, queueItems, today) {
  const explicit = Number(state?.publishedToday?.[today]);
  if (explicit) return explicit;
  const fromState = (state?.published || []).filter(
    (p) => String(p?.firstSeen || "") === today,
  ).length;
  if (fromState) return fromState;
  let fromQueue = 0;
  for (const it of queueItems) {
    if (it?.status !== "published") continue;
    if (String(it?.notes || "").includes(`published ${today}`)) fromQueue++;
  }
  return fromQueue;
}

function main() {
  const state = readJson(STATE_PATH, {}) || {};
  const cfg = readJson(CONFIG_PATH, {}) || {};
  const q = queueCounts();
  const b = bucketCounts(state);

  const dailyCount = Number(cfg.daily_count) || 0;
  const dailyMax = Number(cfg.daily_count_max) || dailyCount;
  const reserve = Number(cfg.bings_quota_reserve ?? 25);
  const today = new Date().toISOString().slice(0, 10);
  const queueRaw = readJson(QUEUE_PATH, { items: [] });
  const queueItems = Array.isArray(queueRaw) ? queueRaw : queueRaw.items || [];
  const publishedToday = publishedTodayCount(state, queueItems, today);

  const discovered = b.indexed + b.not_indexed + b.blocked;
  const indexRate = discovered > 0 ? b.indexed / discovered : null;
  const gapTotal = b.not_discovered + b.unknown;
  const discoveryGap = gapTotal > 0 ? gapTotal / (gapTotal + discovered) : null;

  const bingDaily = Number(state.bing?.quotaRemaining ?? DAILY_BING_TOTAL);
  const bingMonthly = Number(state.bing?.quotaMonthly ?? MONTHLY_BING_TOTAL);
  const bingMonthlyUsed = Math.max(0, MONTHLY_BING_TOTAL - bingMonthly);
  const bingMonthlyPct = bingMonthly / MONTHLY_BING_TOTAL;

  const runway = dailyCount > 0 ? q.draft / dailyCount : null;

  // ── Alert ─────────────────────────────────────────────────────────────────
  const alerts = [];
  if (cfg.halt) {
    alerts.push({
      level: "critical",
      code: "halt",
      msg: `publish di-HALT (${cfg.halt_reason || "tanpa alasan"})`,
    });
  }
  if (indexRate !== null && indexRate < 0.4) {
    alerts.push({
      level: "critical",
      code: "index_rate",
      msg: `index_rate ${(indexRate * 100).toFixed(1)}% < 40%`,
    });
  } else if (indexRate !== null && indexRate < 0.5) {
    alerts.push({
      level: "warn",
      code: "index_rate",
      msg: `index_rate ${(indexRate * 100).toFixed(1)}% < 50%`,
    });
  }
  if (bingMonthlyPct <= 0.1) {
    alerts.push({
      level: "critical",
      code: "bing_quota",
      msg: `kuota Bing bulan tinggal ${bingMonthly} (${(bingMonthlyPct * 100).toFixed(1)}%) — reserve ${reserve}`,
    });
  } else if (bingMonthlyPct <= 0.2) {
    alerts.push({
      level: "warn",
      code: "bing_quota",
      msg: `kuota Bing bulan ${(bingMonthlyPct * 100).toFixed(1)}%`,
    });
  }
  if (runway !== null && runway < 2) {
    alerts.push({
      level: "critical",
      code: "runway",
      msg: `runway draft ${runway.toFixed(1)} hari (< 2)`,
    });
  } else if (runway !== null && runway < 7) {
    alerts.push({
      level: "warn",
      code: "runway",
      msg: `runway draft ${runway.toFixed(1)} hari (< 7)`,
    });
  }
  if (dailyCount > 0 && publishedToday > dailyCount) {
    alerts.push({
      level: "critical",
      code: "overshoot",
      msg: `publish hari ini ${publishedToday} > daily_count ${dailyCount}`,
    });
  }
  if (discoveryGap !== null && discoveryGap > 0.3) {
    alerts.push({
      level: "warn",
      code: "discovery_gap",
      msg: `discovery gap ${(discoveryGap * 100).toFixed(0)}% (${gapTotal} URL belum dijumpai Google)`,
    });
  }

  const report = {
    at: new Date().toISOString(),
    day: today,
    publish: {
      publishedToday,
      dailyCount,
      dailyMax,
      slices: Number(cfg.publish_slices) || 0,
      sliceCount: Number(cfg.slice_count) || 0,
      window: cfg.publish_window || null,
      halt: Boolean(cfg.halt),
      queue: q,
      runwayDays: runway === null ? null : Number(runway.toFixed(1)),
    },
    indexing: {
      indexRate: indexRate === null ? null : Number(indexRate.toFixed(4)),
      buckets: b,
      discovered,
      discoveryGap:
        discoveryGap === null ? null : Number(discoveryGap.toFixed(4)),
      lastInspect: state.gsc?.lastRun?.at || null,
      inspectedTotal: Object.keys(state.gsc?.inspections || {}).length,
      publishedTotal: (state.published || []).length,
    },
    bing: {
      dailyRemaining: bingDaily,
      dailyTotal: DAILY_BING_TOTAL,
      monthlyRemaining: bingMonthly,
      monthlyUsed: bingMonthlyUsed,
      monthlyTotal: MONTHLY_BING_TOTAL,
      reserve,
      lastRun: state.bing?.lastRun || null,
    },
    ramp: state.rampGate?.lastRun || null,
    indexer: state.indexer?.lastRun || null,
    alerts,
  };

  if (JSON_OUT) {
    console.log(JSON.stringify(report, null, 2));
    return STRICT && alerts.some((a) => a.level === "critical") ? 1 : 0;
  }

  // ── Laporan harian (snapshot + 30 hari sejarah) ──────────────────────────
  const line = `| ${today} | ${publishedToday}/${dailyCount} | ${indexRate === null ? "—" : (indexRate * 100).toFixed(1) + "%"} | ${b.indexed}/${discovered} | ${bingDaily}/${DAILY_BING_TOTAL} | ${bingMonthly}/${MONTHLY_BING_TOTAL} | ${runway === null ? "—" : runway.toFixed(1) + "d"} | ${q.draft} | ${alerts.map((a) => a.code).join(", ") || "—"} |`;
  const header = [
    "# SEO Daily Status (auto)",
    "",
    `> Dijana oleh \`seo/seo-status.mjs\`. Snapshot terakhir: **${report.at}**.`,
    "> Fail ini UNTRACKED — artefak operasi, bukan sumber kebenaran.",
    "",
    "## Snapshot hari ini",
    "",
    `- **Publish hari ini**: ${publishedToday}/${dailyCount} (had) · ${q.published} published · ${q.draft} draft · ${q.pending} pending · runway ${report.publish.runwayDays ?? "—"} hari`,
    `- **Indexing**: index_rate ${report.indexing.indexRate === null ? "—" : (report.indexing.indexRate * 100).toFixed(1) + "%"} · ${b.indexed} indexed / ${b.not_indexed} not_indexed / ${b.not_discovered} not_discovered / ${b.blocked} blocked / ${b.unknown} unknown · gap ${report.indexing.discoveryGap === null ? "—" : (report.indexing.discoveryGap * 100).toFixed(0) + "%"}`,
    `- **Cakupan**: ${report.indexing.inspectedTotal} URL ter-inspect GSC · ${report.indexing.publishedTotal} URL published di state`,
    `- **Bing**: harian ${bingDaily}/${DAILY_BING_TOTAL} · bulanan ${bingMonthly}/${MONTHLY_BING_TOTAL} (terpakai ${bingMonthlyUsed}) · reserve ${reserve}`,
    `- **Config**: daily_count ${dailyCount} (min ${cfg.daily_count_min} / max ${dailyMax}) · ${cfg.publish_slices || 0}×${cfg.slice_count || 0} slot · ${cfg.publish_window || "-"} · halt ${cfg.halt ? "YA" : "tidak"}`,
    "",
    alerts.length
      ? `## Alert (${alerts.length})\n\n${alerts.map((a) => `- **${a.level.toUpperCase()}** \`${a.code}\` — ${a.msg}`).join("\n")}\n`
      : "## Alert\n\nTiada alert. ✅\n",
    "## Sejarah (30 hari)",
    "",
    "| Hari | Publish | Index rate | Indexed/Discovered | Bing harian | Bing bulanan | Runway | Draft | Alert |",
    "|---|---|---|---|---|---|---|---|---|",
  ].join("\n");

  let history = [];
  if (existsSync(OUT_MD)) {
    const prev = readFileSync(OUT_MD, "utf8");
    const rows = prev.split("\n").filter((l) => l.startsWith("| 20"));
    history = rows.filter((r) => !r.includes(`| ${today} |`));
  }
  const md = `${header}\n${[...history, line].slice(-30).join("\n")}\n`;
  mkdirSync(dirname(OUT_MD), { recursive: true });
  writeFileSync(OUT_MD, md);

  if (!QUIET) {
    console.log(
      `[seo-status] publish ${publishedToday}/${dailyCount} · index_rate ${indexRate === null ? "—" : (indexRate * 100).toFixed(1) + "%"} · inspected ${report.indexing.inspectedTotal}/${report.indexing.publishedTotal} · bing ${bingDaily}h/${bingMonthly}b · runway ${report.publish.runwayDays ?? "—"}d · ${alerts.length} alert${alerts.length ? " (" + alerts.map((a) => a.code).join(",") + ")" : ""}`,
    );
    for (const a of alerts) console.log(`  [${a.level}] ${a.code}: ${a.msg}`);
  }
  return STRICT && alerts.some((a) => a.level === "critical") ? 1 : 0;
}

process.exit(main());
