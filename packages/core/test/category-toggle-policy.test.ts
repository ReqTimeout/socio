/**
 * SELFTEST keputusan toggle kategori (W1/F2 — port .my category-toggle-policy,
 * gap-plan 2026-11-17 P2.1, adaptasi semantik .id).
 *
 * Mengunci kontrak "enable hanya provider yang melayani, tolak tanpa tulis DB":
 *  1. OFF → semua provider, TIDAK PERNAH refuse (provider rusak tidak boleh
 *     menjebak admin). affected .id = jumlah baris AKTIF (bukan semua baris).
 *  2. ON → hanya status=0 + bertag manual-off dari provider sah: routing target
 *     menang, else provider aktif global. affected jujur per baris memenuhi.
 *  3. Refuse no_active_provider / no_serving_services → affected 0, pemanggil
 *     dilarang menulis DB (invariant).
 *  4. Matriks 192 kombinasi (8 bentuk baris × 4 routed × 3 active × 2 mode)
 *     dicek invariant-nya + determinisme + tanpa mutasi input.
 *
 * Fungsi ini DIPANGGIL LANGSUNG oleh jalur produksi (category-admin.ts), jadi
 * regresi keputusan = test gagal, bukan bug senyap di admin/katalog.
 * Bagian W4 (FINAL_STATUSES) sudah dikunci order-status.test.ts — tidak dobel.
 *
 * Run: node --experimental-strip-types --import ./test/register.mjs test/category-toggle-policy.test.ts
 */
import assert from "node:assert/strict";

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
const svc = (providerId: number, status: number, manualOff: boolean): ToggleSvc => ({
  providerId,
  status,
  manualOff,
});
/** Baris mati bertag [manual-off] (dimatikan admin — bisa dihidupkan lagi). */
const tagOff = (pid: number): ToggleSvc => svc(pid, 0, true);
/** Baris mati tanpa tag (dimatikan sync — TIDAK boleh dihidupkan toggle). */
const plainOff = (pid: number): ToggleSvc => svc(pid, 0, false);
/** Baris aktif. */
const on = (pid: number): ToggleSvc => svc(pid, 1, false);

console.log("category-toggle-policy selftest (W1, adaptasi .id)");

// ── 1. sisi OFF: semua provider, tidak pernah ditolak ──────────────────────
check("OFF: ada >=1 aktif → matikan semua provider, affected = jumlah baris AKTIF (.id)", () => {
  const svcs = [on(P1), plainOff(P1), on(P2), tagOff(P2)];
  const plan = planCategoryToggle(svcs, undefined, P1);
  assert.equal(plan.turnedOff, true);
  assert.equal(plan.allowedProvider, null, "off tanpa filter provider (WHERE kategori saja)");
  assert.equal(plan.affected, 2, "toast/audit jujur: hanya 2 baris aktif yang berubah di .id");
  assert.equal(plan.refuse, null);
});

check('OFF: status string "1" dari MySQL tetap dinormalisasi', () => {
  const svcs = [{ providerId: P2, status: "1", manualOff: false }] as unknown as ToggleSvc[];
  assert.equal(planCategoryToggle(svcs, undefined, P1).turnedOff, true);
});

check("OFF: tetap bisa walau provider aktif null (owner harus bisa mematikan)", () => {
  const plan = planCategoryToggle([on(P2)], undefined, null);
  assert.equal(plan.turnedOff, true);
  assert.equal(plan.refuse, null, "sisi OFF tidak boleh refuse — itu menjebak admin");
});

check("OFF: routed ke provider lain tidak mengubah sisi off", () => {
  const plan = planCategoryToggle([on(P1), tagOff(P2)], P2, P1);
  assert.equal(plan.turnedOff, true);
  assert.equal(plan.allowedProvider, null);
  assert.equal(plan.affected, 1);
});

check(
  "OFF eksplisit: tanpa baris aktif pun tidak refuse (affected 0, mode menimpa deteksi)",
  () => {
    const plan = planCategoryToggle([tagOff(P1)], undefined, null, "off");
    assert.equal(plan.turnedOff, true);
    assert.equal(plan.affected, 0);
    assert.equal(plan.refuse, null);
  },
);

// ── 2. sisi ON: HANYA manual-off provider yang melayani ────────────────────
check("ON tanpa routing → provider aktif global saja", () => {
  const svcs = [tagOff(P1), tagOff(P1), tagOff(P2)];
  const plan = planCategoryToggle(svcs, undefined, P1);
  assert.equal(plan.turnedOff, false);
  assert.equal(plan.allowedProvider, P1);
  assert.equal(plan.affected, 2, "P2 tetap mati — bukan 3");
  assert.equal(plan.refuse, null);
});

check("ON dengan routing → target routing MENANG atas aktif global", () => {
  const svcs = [tagOff(P1), tagOff(P2), tagOff(P2)];
  const plan = planCategoryToggle(svcs, P2, P1);
  assert.equal(plan.allowedProvider, P2, "routing target menang, bukan aktif global");
  assert.equal(plan.affected, 2);
  assert.equal(plan.refuse, null);
});

check("ON kategori campuran → affected hanya provider sah, yang lain tidak disentuh", () => {
  const svcs = [tagOff(P1), tagOff(P2), tagOff(P2), tagOff(P2)];
  const plan = planCategoryToggle(svcs, undefined, P1);
  assert.equal(plan.allowedProvider, P1);
  assert.equal(plan.affected, 1);
});

check("ON .id: baris mati TANPA tag tidak dihitung (sync-disabled tetap off)", () => {
  const svcs = [plainOff(P1), plainOff(P1), tagOff(P1)];
  const plan = planCategoryToggle(svcs, undefined, P1);
  assert.equal(plan.affected, 1, "hanya baris bertag manual-off yang hidup lagi");
  assert.equal(plan.refuse, null);
});

check("ON eksplisit dengan baris aktif → mode menimpa deteksi buta (tetap ON)", () => {
  const svcs = [on(P1), tagOff(P1), tagOff(P2)];
  const plan = planCategoryToggle(svcs, undefined, P1, "on");
  assert.equal(plan.turnedOff, false);
  assert.equal(plan.affected, 1);
  assert.equal(plan.refuse, null);
});

// ── 3. TOLAK: jangan tulis UPDATE 0 baris lalu lapor "enabled" ─────────────
check("BUG F2: kategori dorman-only bertag + aktif P1 → no_serving_services", () => {
  const svcs = [tagOff(P2), tagOff(P2), tagOff(P2)];
  const plan = planCategoryToggle(svcs, undefined, P1);
  assert.equal(plan.refuse, "no_serving_services");
  assert.equal(plan.affected, 0);
  assert.equal(plan.turnedOff, false);
});

check("Tanpa routing & tanpa provider aktif → no_active_provider", () => {
  const plan = planCategoryToggle([tagOff(P1)], undefined, null);
  assert.equal(plan.refuse, "no_active_provider");
  assert.equal(plan.allowedProvider, null);
  assert.equal(plan.affected, 0);
});

check("Routing menunjuk provider yang tidak punya layanan di kategori ini → refuse", () => {
  const plan = planCategoryToggle([tagOff(P1)], P2, P1);
  assert.equal(plan.refuse, "no_serving_services");
  assert.equal(plan.affected, 0);
});

check("routed=0 (baris routing rusak) → refuse, bukan hidupkan semua", () => {
  const plan = planCategoryToggle([tagOff(P1), tagOff(P2)], 0, P1);
  assert.equal(plan.refuse, "no_serving_services");
  assert.equal(plan.affected, 0, "0 bukan provider sah — jangan jatuh balik ke aktif global");
});

check("Kategori kosong → refuse (caller sudah pulang 'empty' lebih awal)", () => {
  assert.equal(planCategoryToggle([], undefined, P1).refuse, "no_serving_services");
});

check("ON semua mati tanpa tag → no_serving_services (tidak ada yang bisa dihidupkan)", () => {
  const plan = planCategoryToggle([plainOff(P1), plainOff(P2)], undefined, P1);
  assert.equal(plan.refuse, "no_serving_services");
  assert.equal(plan.affected, 0);
});

// ── 4. invariant keselamatan + tanpa mutasi input ──────────────────────────
check("INVARIANT: refuse != null → affected 0 (pemanggil tidak boleh menulis DB)", () => {
  const cases: Array<[ToggleSvc[], number | undefined, number | null]> = [
    [[tagOff(P2)], undefined, P1],
    [[tagOff(P1)], undefined, null],
    [[tagOff(P1)], P2, P1],
    [[tagOff(P1), tagOff(P2)], 0, P1],
    [[], undefined, P1],
    [[on(P1), on(P2)], undefined, null],
  ];
  for (const [svcs, routed, active] of cases) {
    const plan = planCategoryToggle(svcs, routed, active);
    if (plan.refuse !== null) {
      assert.equal(plan.affected, 0, `refuse=${plan.refuse} tapi affected=${plan.affected}`);
    }
  }
});

check("INVARIANT: allowedProvider null hanya bila off atau refuse", () => {
  const ok = planCategoryToggle([tagOff(P1), tagOff(P2)], undefined, P1);
  assert.equal(ok.refuse, null);
  assert.notEqual(ok.allowedProvider, null);
});

check("Input tidak dimutasi (array & objek layanan tetap)", () => {
  const svcs = [tagOff(P1), on(P2)];
  const snapshot = JSON.stringify(svcs);
  planCategoryToggle(svcs, undefined, P1);
  planCategoryToggle(svcs, P2, null);
  assert.equal(JSON.stringify(svcs), snapshot);
});

// ── 5. matriks 192 kombinasi: invariant + determinisme ─────────────────────
const shapes: ToggleSvc[][] = [
  [],
  [on(P1)],
  [tagOff(P1)],
  [plainOff(P1)],
  [tagOff(P2)],
  [tagOff(P1), tagOff(P2)],
  [on(P1), tagOff(P2)],
  [plainOff(P1), plainOff(P2)],
];
const routeds: Array<number | undefined> = [undefined, 0, P1, P2];
const actives: Array<number | null> = [null, P1, P2];
const modes: Array<"on" | undefined> = [undefined, "on"];

let combos = 0;
for (const svcs of shapes) {
  for (const routed of routeds) {
    for (const active of actives) {
      for (const mode of modes) {
        const plan = planCategoryToggle(svcs, routed, active, mode);
        combos++;
        // invariant keselamatan
        if (plan.refuse !== null)
          assert.equal(plan.affected, 0, `refuse tapi affected>0 (#${combos})`);
        if (plan.turnedOff) {
          assert.equal(plan.refuse, null, `off tidak boleh refuse (#${combos})`);
          assert.equal(plan.allowedProvider, null, `off tanpa filter provider (#${combos})`);
        } else if (plan.refuse === null) {
          assert.notEqual(plan.allowedProvider, null, `on lulus wajib punya provider (#${combos})`);
          assert.ok(plan.affected > 0, `on lulus wajib mengubah baris (#${combos})`);
        }
        if (plan.allowedProvider === null) {
          assert.ok(plan.turnedOff || plan.refuse !== null, `null hanya off/refuse (#${combos})`);
        }
        // determinisme: panggilan kedua identik
        assert.deepEqual(
          plan,
          planCategoryToggle(svcs, routed, active, mode),
          `tidak determinis (#${combos})`,
        );
      }
    }
  }
}
check(
  `Matriks ${combos} kombinasi (8 bentuk × 4 routed × 3 active × 2 mode) lulus invariant`,
  () => {
    assert.equal(combos, 192);
  },
);

check("Mode off eksplisit di 96 kombinasi state tidak pernah refuse", () => {
  let n = 0;
  for (const svcs of shapes) {
    for (const routed of routeds) {
      for (const active of actives) {
        const plan = planCategoryToggle(svcs, routed, active, "off");
        assert.equal(plan.refuse, null);
        assert.equal(plan.turnedOff, true);
        n++;
      }
    }
  }
  assert.equal(n, 96);
});

// ── ringkas
console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  console.error("\nFAILURES:\n" + failures.map((f) => " - " + f).join("\n"));
  process.exit(1);
}
