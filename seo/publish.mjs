#!/usr/bin/env node
/**
 * seo/publish.mjs — promote draft → build → deploy → IndexNow ping (spec §4).
 *
 * Langkah:
 *   1. Ambil draft terbaik (priority DESC, lama duduk ASC) dari queue status='draft'
 *      yang file MDX-nya ada + draft:true
 *   2. Flip frontmatter draft:false, set pubDate=now
 *   3. pnpm --filter landing build
 *   4. node seo/llms.mjs (regen llms.txt dari dist/sitemap) + salin ke dist
 *   5. wrangler pages deploy landing/dist (env CLOUDFLARE_API_TOKEN + ACCOUNT_ID)
 *   6. indexnow.mjs ping URL baru + update state.json
 *
 * Usage:
 *   node seo/publish.mjs --count=1
 *   node seo/publish.mjs --count=1 --no-deploy   # flip + build saja (review manual)
 *   node seo/publish.mjs --slug=apa-itu-smm-panel # publish spesifik
 */

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync, spawn, execFileSync } from 'node:child_process';
import { ROOT, BLOG_DIR, QUEUE_PATH, PUBLIC_DIR } from './paths.mjs';
const SITE = 'https://socio.id';

/**
 * daily_count default dari seo/config.json (ditulis ramp-gate.mjs tiap Senin).
 * `--count=N` eksplisit selalu menang. Kalau config tidak ada → fallback 1
 * (perilaku lama, supaya publish manual tidak ikut berubah diam-diam).
 */
function configuredDailyCount() {
  try {
    const cfg = JSON.parse(readFileSync(join(ROOT, 'seo/config.json'), 'utf8'));
    const n = Number(cfg.daily_count);
    return Number.isFinite(n) && n >= 0 ? n : 1;
  } catch {
    return 1;
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { count: configuredDailyCount(), noDeploy: false, slug: null, countExplicit: false, skipUniqueness: false };
  for (const a of args) {
    if (a.startsWith('--count=')) {
      opts.count = parseInt(a.slice(10));
      opts.countExplicit = true;
    } else if (a === '--no-deploy') opts.noDeploy = true;
    else if (a.startsWith('--slug=')) opts.slug = a.slice(7);
  }
  if (!opts.countExplicit) console.log(`publish: daily_count dari config.json = ${opts.count} (--count= untuk override)`);
  return opts;
}

function pickDrafts(queue, count, slug) {
  const drafts = queue.items.filter((i) => {
    if (i.status !== 'draft') return false;
    if (slug) return i.slug === slug;
    return existsSync(`${BLOG_DIR}/${i.slug}.mdx`);
  });
  if (slug) return drafts;
  return drafts
    .sort((a, b) => (b.priority || 0) - (a.priority || 0) || (a.notes || '').localeCompare(b.notes || ''))
    .slice(0, count);
}

/**
 * Gate anti-duplicate (plan v2 §9 scaled-content-abuse). Dipanggil PER SLUG:
 * corpus penuh memang punya banyak pasangan mirip warisan, jadi kalau global
 * gate akan selalu gagal dan memblokir semua publish. Yang kita tolak hanya
 * slug yang SENDIRI involved dalam pasangan FAIL.
 */
function uniquenessGate(slug) {
  try {
    execFileSync(process.execPath, [join(ROOT, 'seo/qc-uniqueness.mjs'), '--slug', slug, '--json'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, SEO_NOTIFY_DRYRUN: '1' },
    });
    return { ok: true, detail: null };
  } catch (e) {
    if (e.status === 1) {
      let detail = null;
      try {
        const j = JSON.parse(e.stdout || '{}');
        detail = (j.failsDetail || []).slice(0, 3).map((p) => `${p.b} (score ${p.score})`);
      } catch {}
      return { ok: false, detail };
    }
    // exit 2 = tool error (mis. corpus kosong) → jangan blokir publish, tapi louder
    return { ok: true, detail: null, warn: e.message?.slice(0, 120) };
  }
}

function flipDraft(path) {
  const src = readFileSync(path, 'utf8');
  const today = new Date().toISOString().slice(0, 10);
  const flipped = src
    .replace(/^draft:\s*true\s*$/m, 'draft: false')
    .replace(/^pubDate:\s*\d{4}-\d{2}-\d{2}\s*$/m, `pubDate: ${today}`);
  if (flipped === src) throw new Error('frontmatter tidak berubah — draft:true tidak ditemukan?');
  writeFileSync(path, flipped);
  return today;
}

function run(cmd, opts = {}) {
  console.log(`  $ ${cmd}`);
  return execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts });
}

async function main() {
  const opts = parseArgs();
  const queue = JSON.parse(readFileSync(QUEUE_PATH, 'utf8'));

  const targets = pickDrafts(queue, opts.count, opts.slug);
  if (!targets.length) {
    console.log('Tidak ada draft siap publish (queue status=draft + file MDX ada).');
    console.log('Generate dulu: node seo/generate.mjs --count=2');
    process.exit(1);
  }

  // Gate anti-duplicate: sisipkan draft yang mirip artikel existing, lalu publish
  // lagi pakai slot kuota harian dan menjatuhkan index_rate → ramp-gate turun.
  const cleared = [];
  const blockedByGate = [];
  if (!opts.skipUniqueness) {
    console.log('Gate qc-uniqueness (anti scaled-content-abuse):');
    for (const t of targets) {
      const g = uniquenessGate(t.slug);
      if (g.warn) console.log(`  ⚠ ${t.slug}: gate error (tidak memblokir) — ${g.warn}`);
      if (g.ok) {
        cleared.push(t);
      } else {
        blockedByGate.push(t);
        console.log(`  ✗ ${t.slug} DITOLAK — mirip: ${(g.detail || []).join(', ')}`);
        console.log('    → rombak artikelnya (tambah data unik /_angle berbeda), atau publish manual dengan --skip-uniqueness');
      }
    }
    if (blockedByGate.length) {
      console.log(`\n${blockedByGate.length} slug diblokir gate, ${cleared.length} lolos.`);
    }
  } else {
    cleared.push(...targets);
    console.log('Gate qc-uniqueness: DILEWATI (--skip-uniqueness)');
  }

  if (!cleared.length) {
    console.log('\nTidak ada draft yang lolos gate — tidak ada yang dipublish.');
    process.exitCode = 1;
    return;
  }

  const publishedUrls = [];
  for (const t of cleared) {
    const path = `${BLOG_DIR}/${t.slug}.mdx`;
    console.log(`\n--- publish ${t.slug} ---`);
    const today = flipDraft(path);
    t.status = 'published';
    t.notes = (t.notes || '').replace(/\s*\|\s*generated[^\n]*/, '').trim();
    t.notes = (t.notes ? t.notes + ' | ' : '') + `published ${today}`;
    publishedUrls.push(`${SITE}/blog/${t.slug}/`);
    console.log(`  draft:false, pubDate:${today}`);
  }

  writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2) + '\n');

  // Bangun internal mesh (plan v2 §6.1): menulis related[] ke frontmatter artikel
  // published. HARUS sebelum build supaya link-nya ikut ter-render di HTML.
  // Idempoten (jalankan ulang = 0 perubahan) dan fail-closed kalau related[]
  // menghasilkan duplikat atau pagar frontmatter rusak.
  console.log('\n=== bangun internal mesh (plan v2 §6.1) ===');
  run('node seo/mesh-build.mjs --write');

  // Build
  console.log('\n=== build landing ===');
  run('pnpm --filter landing build');

  // Validasi schema JSON-LD (plan v2 §5.3 "wire post-build"). Fail-CLOSED:
  // schema rusak = halaman tidak bisa dapat rich result, jadi lebih baik
  // deploy tertahan daripada diam-diamiga rusak ke produksi.
  console.log('\n=== validasi schema JSON-LD ===');
  try {
    run('node seo/jsonld-validate.mjs --strict');
    console.log('  schema OK (0 error, 0 warning)');
  } catch (e) {
    console.error('\nFATAL: validasi JSON-LD gagal — deploy DIBATASI (schema rusak akaniphy/damaged produksi).');
    console.error('  Perbaiki dulu, atau bypass SADARI: --no-deploy lalu deploy manual setelah dicek.');
    throw e;
  }

  // Regen llms.txt + llms-full.txt (reads dist/sitemap-0.xml — must run after build)
  console.log('\n=== llms regen ===');
  run('node seo/llms.mjs');
  // Astro copies public/ at build-time; llms wrote AFTER build → copy to dist manually
  for (const f of ['llms.txt', 'llms-full.txt']) {
    const src = `${PUBLIC_DIR}/${f}`;
    if (existsSync(src)) copyFileSync(src, `${ROOT}/landing/dist/${f}`);
  }

  if (opts.noDeploy) {
    console.log('\n--no-deploy: build selesai, deploy manual:');
    console.log('  export CLOUDFLARE_API_TOKEN=…; export CLOUDFLARE_ACCOUNT_ID=0298214d1069f75436f490b51ea4763e');
    console.log('  npx wrangler pages deploy landing/dist --project-name socio-id --branch main --commit-dirty=true');
    console.log(`  node seo/indexnow.mjs ${publishedUrls.join(' ')}`);
    return;
  }

  // Deploy (butuh env CF — dari accountcf.md, JANGAN hardcode)
  if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID) {
    console.error('\nFATAL: CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID belum di-set (lihat accountcf.md).');
    console.error('Draft sudah di-flip + queue updated. Deploy manual lalu ping:');
    console.error(`  node seo/indexnow.mjs ${publishedUrls.join(' ')}`);
    process.exit(1);
  }
  console.log('\n=== deploy ===');
  run('npx wrangler pages deploy landing/dist --project-name socio-id --branch main --commit-dirty=true');

  // IndexNow
  console.log('\n=== indexnow ===');
  const child = spawn('node', [`${ROOT}/seo/indexnow.mjs`, ...publishedUrls], {
    stdio: 'inherit',
    cwd: ROOT,
  });
  child.on('close', (code) => {
    console.log(`\nDone: ${publishedUrls.length} artikel live:`);
    for (const u of publishedUrls) console.log(`  ${u}`);
    process.exit(code || 0);
  });
}

main().catch((e) => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
