/**
 * SELFTEST hitungan katalog per provider (F13 — port .my 083d0271, gap-plan
 * 2026-11-17 P2.2, adaptasi semantik .id).
 *
 * Owner: "/admin/services ko ga relate dengan categorynya". Punca: kedua halaman
 * menghitung `active/total` lintas SEMUA provider, jadi baris provider dorman
 * mencemari denominator katalog serving → badge "Partial" palsu + switch rail
 * bicara lain dari tabel. Di .id sisa P9 sudah dibersihkan, tapi baris provider
 * dorman di kategori CAMPURAN masih bisa muncul — port ini defensif sekaligus
 * menyatukan sumber hitungan.
 *
 * Test ini mengunci TIGA kontrak:
 *  1. categoryHealth — SATU sumber kebenaran badge untuk rail /admin/services,
 *     tabel /admin/categories, dan band konteks kategori.
 *  2. toggleWillTurnOff / toggleAffected / canToggleCategory MESTI sama tepat
 *     dengan planCategoryToggle (fungsi produksi yang menulis DB). Kalau drift,
 *     UI janji arah/jumlah/switch yang server tidak tunaikan.
 *  3. Adaptasi .id: OFF hanya mengubah baris AKTIF (bukan semua baris), ON hanya
 *     baris manual-off provider serving (bukan semua baris serving). Maka
 *     agregat membawa `manualOff` dan canToggleCategory lebih ketat dari .my.
 *
 * Fungsi DIPANGGIL LANGSUNG dari jalur produksi (bukan salinan), jadi regresi
 * = test gagal, bukan angka admin yang senyap bohong. Bagian i18n .my dilewati
 * (admin .id = copy Indonesia inline, tanpa katalog); servingCatalogWhere diuji
 * lewat svelte-check/build/prod (modul server, import DB).
 *
 * Run: node --experimental-strip-types --import ./test/register.mjs test/catalog-counts.test.ts
 */
import assert from "node:assert/strict";

import {
  canToggleCategory,
  categoryHealth,
  emptyCategoryCounts,
  foldCategoryCounts,
  hasLegacyLeak,
  servingProviderFor,
  toggleAffected,
  toggleWillTurnOff,
  type ProviderCountRow,
  type ServingContext,
} from "../../../app/src/lib/catalog-counts.ts";
import {
  planCategoryToggle,
  type ToggleSvc,
} from "../../../app/src/lib/server/category-toggle-policy.ts";

let passed = 0;
const failures: string[] = [];

function check(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    failures.push(`${name}: ${msg}`);
    console.log(`FAIL  ${name}: ${msg}`);
  }
}

/** P1 = SMMturk (aktif global .id = 2), P2 = provider dorman (mis. 10). */
const P1 = 2;
const P2 = 10;
const CID = 781;
const live: ServingContext = { activeProviderId: P1, routing: new Map() };
const row = (
  providerId: number,
  total: number,
  active: number,
  manualOff = 0,
): ProviderCountRow => ({ categoryId: CID, providerId, total, active, manualOff });
const countsFor = (rows: ProviderCountRow[], ctx: ServingContext = live) =>
  foldCategoryCounts(rows, ctx).get(CID) ?? emptyCategoryCounts(ctx, CID);

/** Bentuk baris untuk matriks — sama dengan helper di category-toggle-policy.test. */
const svc = (providerId: number, status: number, manualOff: boolean): ToggleSvc => ({
  providerId,
  status,
  manualOff,
});
const on = (pid: number): ToggleSvc => svc(pid, 1, false);
const tagOff = (pid: number): ToggleSvc => svc(pid, 0, true);
const plainOff = (pid: number): ToggleSvc => svc(pid, 0, false);

console.log("catalog-counts selftest (F13, adaptasi .id)");

// ── 1. siapa melayani ────────────────────────────────────────────────────────
check("servingProviderFor: tanpa routing → provider aktif global", () => {
  assert.equal(servingProviderFor(CID, live), P1);
});

check("servingProviderFor: routing target MENANG atas provider aktif", () => {
  const ctx: ServingContext = { activeProviderId: P1, routing: new Map([[CID, P2]]) };
  assert.equal(servingProviderFor(CID, ctx), P2);
});

check("servingProviderFor: tanpa provider aktif & tanpa routing → null", () => {
  assert.equal(servingProviderFor(CID, { activeProviderId: null, routing: new Map() }), null);
});

// ── 2. health: satu sumber kebenaran badge ───────────────────────────────────
check("F13 kategori campuran: 8/8 serving ON + 0/34 dorman → ON (bukan Partial)", () => {
  const c = countsFor([row(P1, 8, 8), row(P2, 34, 0)]);
  assert.equal(c.total, 42, "total mentah tetap 42 (guard hapus perlu ini)");
  assert.equal(c.active, 8);
  assert.equal(c.servingTotal, 8, "hanya katalog yang bisa di-order");
  assert.equal(c.servingActive, 8);
  assert.equal(c.legacyTotal, 34);
  assert.equal(c.legacyActive, 0);
  assert.equal(categoryHealth(c), "on", "inilah badge palsu yang owner lihat");
  assert.equal(hasLegacyLeak(c), false);
});

check("Kategori dorman-only → ARCHIVED, bukan Off (tidak bisa dihidupkan)", () => {
  const c = countsFor([row(P2, 12, 0)]);
  assert.equal(c.servingTotal, 0);
  assert.equal(categoryHealth(c), "archived");
  assert.equal(toggleWillTurnOff(c), false);
  assert.equal(toggleAffected(c), 0);
  assert.equal(canToggleCategory(c), false, "switch jangan tampil — enable pasti ditolak");
});

check("Kategori kosong → EMPTY (bisa dihapus), bukan Off", () => {
  const c = countsFor([]);
  assert.equal(c.total, 0);
  assert.equal(categoryHealth(c), "empty");
});

check("Katalog serving ada tapi semua mati → OFF", () => {
  assert.equal(categoryHealth(countsFor([row(P1, 4, 0)])), "off");
});

check("Sebagian katalog serving mati → PARTIAL yang jujur", () => {
  const c = countsFor([row(P1, 4, 2), row(P2, 10, 0)]);
  assert.equal(categoryHealth(c), "partial");
  assert.equal(c.servingActive, 2);
  assert.equal(c.servingTotal, 4);
});

check("Semua katalog serving hidup → ON", () => {
  assert.equal(categoryHealth(countsFor([row(P1, 4, 4)])), "on");
});

// ── 3. anomali bocor katalog + normalisasi ───────────────────────────────────
check("Arsip masih status=1 → hasLegacyLeak; OFF .id hanya matikan baris AKTIF", () => {
  const c = countsFor([row(P2, 12, 5)]);
  assert.equal(categoryHealth(c), "archived");
  assert.equal(hasLegacyLeak(c), true, "order akan ditolak di checkout — jangan senyap");
  assert.equal(toggleWillTurnOff(c), true);
  assert.equal(toggleAffected(c), 5, "adaptasi .id: OFF mengubah 5 baris aktif, bukan 12 total");
  assert.equal(canToggleCategory(c), true);
});

check("Routing ke P2 → katalog P1 jadi legacy walau P1 aktif global", () => {
  const ctx: ServingContext = { activeProviderId: P1, routing: new Map([[CID, P2]]) };
  const c = countsFor([row(P1, 5, 5), row(P2, 3, 0)], ctx);
  assert.equal(c.servingProviderId, P2);
  assert.equal(c.servingTotal, 3);
  assert.equal(c.servingActive, 0);
  assert.equal(c.legacyActive, 5);
  assert.equal(categoryHealth(c), "off");
  assert.equal(hasLegacyLeak(c), true);
});

check("provider_id 0 (layanan manual tanpa provider) → legacy, bukan serving", () => {
  const c = countsFor([row(0, 3, 3)]);
  assert.equal(c.servingTotal, 0);
  assert.equal(c.legacyTotal, 3);
  assert.equal(categoryHealth(c), "archived");
});

check("Tanpa provider aktif → tanpa katalog serving, semua legacy", () => {
  const c = countsFor([row(P1, 4, 4)], { activeProviderId: null, routing: new Map() });
  assert.equal(c.servingProviderId, null);
  assert.equal(c.servingTotal, 0);
  assert.equal(c.legacyTotal, 4);
});

check("MySQL pulangkan COUNT/SUM sebagai string → tetap dinormalisasi", () => {
  const raw = [
    { categoryId: CID, providerId: P1, total: "8", active: "8", manualOff: "0" },
    { categoryId: CID, providerId: P2, total: "34", active: "0", manualOff: "0" },
  ] as unknown as ProviderCountRow[];
  const c = countsFor(raw);
  assert.equal(c.total, 42, "string concat akan jadi '834' tanpa Number()");
  assert.equal(c.servingActive, 8);
  assert.equal(categoryHealth(c), "on");
});

check("foldCategoryCounts: kategori berasingan tidak bercampur", () => {
  const m = foldCategoryCounts([row(P1, 2, 2), { ...row(P2, 9, 0), categoryId: 999 }], live);
  assert.equal(m.size, 2);
  assert.equal(m.get(CID)?.total, 2);
  assert.equal(m.get(999)?.total, 9);
  assert.equal(categoryHealth(m.get(999)!), "archived");
});

// ── 4. adaptasi .id: semantik toggle manual-off ──────────────────────────────
check("Serving semua mati TANPA tag (dimatikan sync) → canToggle false (.id lebih ketat)", () => {
  const c = countsFor([row(P1, 4, 0, 0)]);
  assert.equal(categoryHealth(c), "off");
  assert.equal(c.servingManualOff, 0);
  assert.equal(toggleWillTurnOff(c), false);
  assert.equal(toggleAffected(c), 0);
  assert.equal(
    canToggleCategory(c),
    false,
    "ON pasti refuse no_serving_services — jangan tampil switch",
  );
  const plan = planCategoryToggle(
    [plainOff(P1), plainOff(P1), plainOff(P1), plainOff(P1)],
    undefined,
    P1,
  );
  assert.equal(plan.refuse, "no_serving_services");
});

check("Serving manual-off → canToggle true, affected = jumlah manual-off serving", () => {
  const c = countsFor([row(P1, 4, 0, 4)]);
  assert.equal(c.servingManualOff, 4);
  assert.equal(toggleWillTurnOff(c), false);
  assert.equal(toggleAffected(c), 4);
  assert.equal(canToggleCategory(c), true);
  const plan = planCategoryToggle([tagOff(P1), tagOff(P1), tagOff(P1), tagOff(P1)], undefined, P1);
  assert.equal(plan.refuse, null);
  assert.equal(plan.affected, 4);
});

check("ON hanya hitung manual-off provider SERVING, legacy bertag diabaikan", () => {
  const c = countsFor([row(P1, 2, 0, 2), row(P2, 3, 0, 3)]);
  assert.equal(c.servingManualOff, 2, "3 baris manual-off P2 (legacy) tidak ikut");
  assert.equal(toggleAffected(c), 2);
  assert.equal(canToggleCategory(c), true);
  const plan = planCategoryToggle(
    [tagOff(P1), tagOff(P1), tagOff(P2), tagOff(P2), tagOff(P2)],
    undefined,
    P1,
  );
  assert.equal(plan.affected, 2);
});

// ── 5. KONTRAK UTAMA: UI mesti sama tepat dengan server (192 kombinasi) ──────
check(
  "toggleWillTurnOff/toggleAffected/canToggleCategory === planCategoryToggle (192 kombinasi)",
  () => {
    // Pool mewakili tiap kelas baris: serving on/tagOff/plainOff, legacy on/tagOff.
    const pool: ToggleSvc[] = [on(P1), tagOff(P1), plainOff(P1), on(P2), tagOff(P2)];
    let n = 0;
    for (const active of [P1, null] as (number | null)[]) {
      for (const routed of [undefined, P1, P2] as (number | undefined)[]) {
        for (let mask = 0; mask < 1 << pool.length; mask++) {
          const svcs = pool.filter((_, i) => mask & (1 << i));
          // Bina agregat per-(kategori,provider) seperti SQL GROUP BY produksi,
          // termasuk manualOff = COUNT(status=0 && bertag).
          const agg = new Map<number, { total: number; active: number; manualOff: number }>();
          for (const s of svcs) {
            const a = agg.get(s.providerId) ?? { total: 0, active: 0, manualOff: 0 };
            a.total++;
            if (s.status === 1) a.active++;
            if (s.status === 0 && s.manualOff) a.manualOff++;
            agg.set(s.providerId, a);
          }
          const rows: ProviderCountRow[] = [...agg.entries()].map(([providerId, a]) => ({
            categoryId: CID,
            providerId,
            total: a.total,
            active: a.active,
            manualOff: a.manualOff,
          }));
          const ctx: ServingContext = {
            activeProviderId: active,
            routing: routed === undefined ? new Map() : new Map([[CID, routed]]),
          };
          const c = countsFor(rows, ctx);
          const plan = planCategoryToggle(svcs, routed, active);
          const label = `active=${active} routed=${routed} mask=${mask}`;
          assert.equal(toggleWillTurnOff(c), plan.turnedOff, `arah drift: ${label}`);
          assert.equal(toggleAffected(c), plan.affected, `jumlah drift: ${label}`);
          assert.equal(
            canToggleCategory(c),
            plan.refuse === null,
            `switch drift (refuse=${plan.refuse}): ${label}`,
          );
          n++;
        }
      }
    }
    assert.equal(n, 192);
  },
);

// ── ringkas
console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.error("\nFAILURES:\n" + failures.map((f) => " - " + f).join("\n"));
  process.exit(1);
}
