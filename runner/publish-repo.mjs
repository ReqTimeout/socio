#!/usr/bin/env node
/**
 * runner/publish-repo.mjs — sinkronkan allowlist file dari monorepo ke repo
 * `ReqTimeout/socio-seo-runner` (private) lewat git over SSH.
 *
 * Kenapa SSH, bukan GitHub API: `GH_TOKEN` (fine-grained PAT) hanya ter-scope ke
 * repo tertentu, jadi `POST /git/blobs` ke repo baru balas 404 dan push HTTPS
 * balas 403 "Write access not granted". SSH key lokal **terdaftar** di GitHub
 * sebagai akun `ReqTimeout`, jadi itu jalur yang bekerja.
 *
 * Kenapa perlu pemisahan repo: monorepo `socio.git` punya auto-deploy Coolify untuk
 * app.socio.id → push ke sana = deploy produksi. Repo ini yang di-build Coolify.
 *
 * Keamanan:
 *   - ALLOWLIST eksplisit (tidak ada glob).
 *   - Tolak file yang mengandung pola private key / token / API key produksi.
 *   - Tolak file > 300 KB.
 *   - Tidak pernah menyalin `.env` / accountcf.md / dumps.
 *
 * Env: SEO_RUNNER_REPO_SLUG (default ReqTimeout/socio-seo-runner)
 *      SEO_RUNNER_CLONE (default /tmp/socio-seo-runner-clone)
 *      SEO_RUNNER_BRANCH (default main) · SEO_RUNNER_DRYRUN=1
 * Usage: node runner/publish-repo.mjs
 */

import { readFileSync, statSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, dirname as pathDirname } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

const SLUG = process.env.SEO_RUNNER_REPO_SLUG || 'ReqTimeout/socio-seo-runner';
const BRANCH = process.env.SEO_RUNNER_BRANCH || 'main';
const CLONE = process.env.SEO_RUNNER_CLONE || '/tmp/socio-seo-runner-clone';
const REMOTE = `git@github.com:${SLUG}.git`;
const DRYRUN = process.env.SEO_RUNNER_DRYRUN === '1';

/** Source (monorepo) → destination (repo runner). */
const FILES = [
  ['runner/package.json', 'package.json'],
  ['runner/Dockerfile', 'Dockerfile'],
  ['runner/README.md', 'runner/README.md'],
  ['runner/idle.mjs', 'runner/idle.mjs'],
  ['runner/daily.mjs', 'runner/daily.mjs'],
  ['runner/weekly.mjs', 'runner/weekly.mjs'],
  ['runner/lib/lock.mjs', 'runner/lib/lock.mjs'],
  ['runner/lib/notify.mjs', 'runner/lib/notify.mjs'],
  ['runner/.dockerignore', '.dockerignore'],
  ['seo/paths.mjs', 'seo/paths.mjs'],
  ['seo/config.json', 'seo/config.json'],
  ['seo/state.seed.json', 'seo/state.seed.json'],
  ['seo/indexer.mjs', 'seo/indexer.mjs'],
  ['seo/indexnow.mjs', 'seo/indexnow.mjs'],
  ['seo/gsc-inspect.mjs', 'seo/gsc-inspect.mjs'],
  ['seo/bing-submit.mjs', 'seo/bing-submit.mjs'],
  ['seo/remedy.mjs', 'seo/remedy.mjs'],
  ['seo/ramp-gate.mjs', 'seo/ramp-gate.mjs'],
  ['seo/lib/gsc.mjs', 'seo/lib/gsc.mjs'],
  ['seo/scripts/gsc-doctor.mjs', 'seo/scripts/gsc-doctor.mjs'],
];

const MAX_BYTES = 300 * 1024;
const SECRET_PATTERNS = [
  /BEGIN [A-Z ]*PRIVATE KEY/,
  /gh[pous]_[A-Za-z0-9]{20,}/,
  /github_pat_[A-Za-z0-9]{20,}/,
  /\b597b6e79eb384b3996e4c43233446847\b/,
  /GSC_SERVICE_ACCOUNT_JSON_B64\s*=\s*[A-Za-z0-9+/=]{40,}/,
];

const git = (args, cwd) =>
  execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();

function rejectIfSuspicious(dest, content) {
  for (const re of SECRET_PATTERNS) {
    if (re.test(content)) {
      throw new Error(`DITOLAK: ${dest} mengandung pola rahasia (${re.source})`);
    }
  }
  const bytes = Buffer.byteLength(content, 'utf8');
  if (bytes > MAX_BYTES) throw new Error(`DITOLAK: ${dest} terlalu besar (${bytes} byte)`);
  return bytes;
}

function ensureClone() {
  const isRepo = existsSync(join(CLONE, '.git'));
  if (!isRepo) {
    // Hapus sisa direktori non-repo (mis. sisa file hasil run sebelumnya).
    rmSync(CLONE, { recursive: true, force: true });
    mkdirSync(CLONE, { recursive: true });
    // -b: nama branch awal langsung BRANCH (repo baru belum punya commit).
    git(['init', '-q', '-b', BRANCH], CLONE);
    git(['remote', 'add', 'origin', REMOTE], CLONE);
  }
  try {
    git(['fetch', 'origin', BRANCH], CLONE);
    git(['checkout', '-q', '-B', BRANCH, `origin/${BRANCH}`], CLONE);
  } catch {
    // Branch di remote belum ada (repo masih kosong) → tetap di branch lokal.
    git(['checkout', '-q', '-B', BRANCH], CLONE);
  }
}

function main() {
  console.log(`publish-repo → ${SLUG}@${BRANCH}${DRYRUN ? ' (DRY-RUN)' : ''}`);
  console.log(`clone lokal   : ${CLONE}\n`);

  const results = { copied: 0, rejected: 0, skipped: 0, changed: [] };

  // PENTING: siapkan clone DULU. ensureClone() menghapus direktori clone kalau
  // belum jadi git repo — kalau dipanggil setelah menyalin file, file itu hilang.
  if (!DRYRUN) ensureClone();

  for (const [src, dest] of FILES) {
    let content;
    try {
      const size = statSync(join(ROOT, src)).size;
      if (size === 0) throw new Error('file kosong');
      content = readFileSync(join(ROOT, src), 'utf8');
    } catch (e) {
      console.log(`  [LEWATI] ${dest} — ${e.message}`);
      results.skipped++;
      continue;
    }

    let bytes;
    try {
      bytes = rejectIfSuspicious(dest, content);
    } catch (e) {
      console.log(`  [TOLAK ] ${dest} — ${e.message}`);
      results.rejected++;
      continue;
    }

    if (DRYRUN) {
      console.log(`  [DRY   ] ${dest} (${bytes} byte)`);
      continue;
    }

    const target = join(CLONE, dest);
    mkdirSync(pathDirname(target), { recursive: true });
    const prev = existsSync(target) ? readFileSync(target, 'utf8') : null;
    if (prev === content) {
      console.log(`  [SAMA  ] ${dest}`);
      continue;
    }
    writeFileSync(target, content);
    results.copied++;
    results.changed.push(dest);
    console.log(`  [SALIN ] ${dest} (${bytes} byte)`);
  }

  if (DRYRUN) {
    console.log(`\nringkasan (dry-run): ${FILES.length - results.skipped - results.rejected} file akan disalin, tidak ada commit`);
    if (results.rejected) process.exitCode = 1;
    return;
  }

  git(['add', '-A'], CLONE);
  const status = git(['status', '--porcelain'], CLONE);
  if (!status) {
    console.log('\nnothing to commit — repo runner sudah sama dengan monorepo');
    return;
  }

  // Repo bisa belum punya commit sama sekali (repo baru) → 'root', bukan error.
  const shortSha = (() => {
    try {
      return git(['rev-parse', '--short', 'HEAD'], CLONE) || 'root';
    } catch {
      return 'root';
    }
  })();
  const msg = `chore(runner): sync ${results.copied} file dari monorepo (${shortSha})`;
  git(['commit', '-q', '-m', msg], CLONE);
  git(['push', '-q', 'origin', `HEAD:${BRANCH}`], CLONE);

  const newSha = git(['rev-parse', 'HEAD'], CLONE);
  console.log(`\ncommit ${newSha.slice(0, 8)} pushed → ${REMOTE}:${BRANCH} (${results.copied} file)`);
  console.log(`https://github.com/${SLUG}/commit/${newSha}`);
  if (results.rejected) {
    console.log(`\nDITOLAK (tidak ikut ter-commit): ${results.rejected} file — perbaiki sumbernya, jangan dipaksa.`);
    process.exitCode = 1;
  }
}

try {
  main();
} catch (e) {
  console.error(`FATAL: ${e.stderr?.toString?.() || e.message}`);
  process.exitCode = 1;
}
