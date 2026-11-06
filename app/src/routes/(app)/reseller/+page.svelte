<script lang="ts">
  import { Chart, Icon, NumberFlow, Sparko, StickerCard, toast } from "@socio/ui";
  import { haptic } from "@socio/ui";
  import { invalidateAll } from "$app/navigation";
  import { formatRupiah } from "$lib/format";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  // Copy halaman — Indonesian hardcoded (konvensi .id, tanpa i18n).
  const money = (v: number) => formatRupiah(v);

  let busy = $state(false);
  async function doUpgrade() {
    if (busy) return;
    haptic();
    busy = true;
    try {
      const res = await fetch("?/upgradeToReseller", {
        method: "POST",
        body: new FormData(),
      });
      const rr = await res.json();
      const d = (rr.data as { error?: string; success?: string }) ?? {};
      if (rr.type === "failure") {
        toast(d.error ?? "Gagal membuat invoice. Coba lagi ya.", "error");
      } else {
        toast(d.success ?? "Invoice aktivasi dibuat!", "success");
        await invalidateAll();
      }
    } catch {
      toast("Gagal membuat invoice. Coba lagi ya.", "error");
    } finally {
      busy = false;
    }
  }

  const benefits = [
    "Harga dasar paling murah — margin jualan ulang kamu paling tebal",
    "Akses 8.000+ layanan Instagram, TikTok, YouTube, dan lainnya",
    "Saldo Rp20.000 sudah termasuk di biaya aktivasi — langsung bisa order",
    "Refill otomatis kalau layanan berkurang dalam garansi",
    "Dukungan prioritas via tiket + WhatsApp",
  ];
  // $derived karena langkah ke-2 menyisipkan data.deadlineLabel (ikut re-render
  // setelah invalidateAll), bukan capture nilai awal saja.
  const howSteps = $derived([
    "Tekan tombol upgrade — invoice aktivasi Rp50.000 terkirim ke email kamu (termasuk saldo Rp20.000).",
    `Transfer tepat nominal ke BCA (angka 3 digit terakhir unik untuk pencocokan) paling lama ${data.deadlineLabel}.`,
    "Admin konfirmasi pembayaran — seketika harga Reseller aktif di semua pesanan kamu.",
  ]);
  const faq = [
    {
      q: "Kenapa lebih murah kalau jadi Reseller?",
      a: "Markup harga dihitung otomatis dari aturan harga live — sebagai Reseller markup kamu lebih rendah, jadi modal per pesanan lebih kecil dan margin jualan ulang lebih tebal. Angka di grafik atas adalah simulasi, bukan janji keuntungan.",
    },
    {
      q: "Bayar Rp50.000 ini hilang?",
      a: "Tidak. Rp20.000 di antaranya masuk saldo akun kamu dan langsung bisa dipakai pesan. Sisanya biaya aktivasi sekali seumur akun.",
    },
    {
      q: "Kapan harga Reseller aktif?",
      a: "Setelah transfer kamu kami konfirmasi (biasanya < 1×24 jam di jam kerja). Kamu dapat email konfirmasi dan harga berubah otomatis di halaman pesanan.",
    },
    {
      q: "Bisa downgrade balik ke Member?",
      a: "Tidak perlu — akun Reseller tetap bisa dipakai untuk diri sendiri. Tidak ada iuran bulanan.",
    },
  ];
</script>

<div class="mx-auto max-w-3xl lg:max-w-4xl">
  <!-- HERO — sticker reward card. Sparko ≤1/layar (DNA .id: pose celebrate). -->
  <StickerCard tone="paper" tilt={0} class="relative overflow-hidden p-5 lg:p-7">
    <span
      class="inline-flex items-center gap-1.5 rounded-full border-2 border-ink-900 bg-mango-300 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-ink-900"
    >
      <Icon name="crown" size={13} stroke={2.5} /> Khusus Member
    </span>
    <div class="mt-3 flex items-start gap-3">
      <div class="min-w-0 flex-1">
        <h1 class="font-display text-2xl font-extrabold leading-tight tracking-tight text-ink-900 lg:text-3xl">
          Beli lebih murah, jual lebih untung
        </h1>
        <p class="mt-2 max-w-prose text-sm leading-relaxed text-ink-700 lg:text-base">
          Naikkan akun kamu ke Reseller — sekali bayar, selamanya dapat harga
          grosir. Sekali klik, invoice instruksi transfer langsung dikirim.
        </p>
      </div>
      <span class="wiggle-once hidden shrink-0 sm:inline-flex" aria-hidden="true">
        <Sparko pose="celebrate" size={56} />
      </span>
    </div>

    <!-- Angka hemat — dihitung dari pricing_rules live (bukan hardcode). -->
    <div class="mt-4 flex flex-wrap items-end gap-x-3 gap-y-1">
      <span class="font-display text-4xl font-extrabold tabular-nums text-primary lg:text-5xl"
        >±{data.chart.savePct}%</span
      >
      <span class="text-sm font-semibold text-ink-700 lg:text-base">lebih hemat per pesanan vs harga Member</span>
    </div>

    <!-- CTA / status — 3 state -->
    <div class="mt-5">
      {#if !data.isMember && !data.activationPending}
        <div class="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-700">
          <Icon name="check" size={18} stroke={2.5} />
          <span><span class="font-bold">Kamu sudah Reseller aktif</span> — harga grosir sudah berlaku di pesananmu.</span>
        </div>
        <a href="/" class="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary hover:text-primary-700">
          Kembali ke beranda<Icon name="chevron_right" size={14} stroke={2.5} />
        </a>
      {:else if data.activationPending}
        <!-- Level sudah Reseller tapi aktivasi belum lunas (234 akun warisan
             prod) — JANGAN klaim sudah aktif; dashboard punya banner resend. -->
        <a
          href="/"
          class="flex items-center gap-3 rounded-2xl border-2 border-ink-900 bg-mango-50 px-4 py-3 transition active:scale-[0.99]"
        >
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mango-100 text-mango-700">
            <Icon name="clock" size={18} stroke={2.25} />
          </span>
          <span class="min-w-0 flex-1 text-sm font-semibold text-ink-900">
            <span class="font-bold">Aktivasi belum lunas</span> — selesaikan pembayaran
            invoice aktivasi di beranda supaya harga Reseller aktif.
          </span>
          <span class="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-primary">
            Ke beranda<Icon name="chevron_right" size={15} stroke={2.5} />
          </span>
        </a>
      {:else if data.hasPending}
        <a
          href="/saldo"
          class="flex items-center gap-3 rounded-2xl border-2 border-ink-900 bg-mango-50 px-4 py-3 transition active:scale-[0.99]"
        >
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mango-100 text-mango-700">
            <Icon name="clock" size={18} stroke={2.25} />
          </span>
          <span class="min-w-0 flex-1 text-sm font-semibold text-ink-900">
            Invoice <b>{money(data.pendingAmount)}</b> masih menunggu pembayaran —
            instruksi transfer sudah dikirim ke emailmu.
          </span>
          <span class="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-primary">
            Buka Saldo<Icon name="chevron_right" size={15} stroke={2.5} />
          </span>
        </a>
      {:else}
        <button
          type="button"
          onclick={doUpgrade}
          disabled={busy}
          class="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-base font-bold text-white shadow-lg shadow-primary/25 transition hover:bg-primary-700 active:scale-[0.98] disabled:opacity-60 lg:w-auto"
        >
          <Icon name="sparkles" size={18} stroke={2.5} />
          {busy ? "Membuat invoice…" : "Upgrade ke Reseller — Rp50.000"}
        </button>
        <p class="mt-2 text-xs text-ink-500">
          Tidak ada perubahan sebelum pembayaranmu dikonfirmasi admin. Nominal
          transfer termasuk saldo Rp20.000 yang langsung bisa dipakai.
        </p>
      {/if}
    </div>
  </StickerCard>

  <!-- MANFAAT + CHART (2 kolom desktop, tumpuk mobile) -->
  <div class="mt-5 grid gap-5 lg:grid-cols-2">
    <section aria-label="Keuntungan Reseller">
      <h2 class="mb-2 font-display text-sm font-bold uppercase tracking-wide text-ink-500">Yang kamu dapat</h2>
      <ul class="grid gap-2">
        {#each benefits as b, i (i)}
          <li class="flex items-start gap-2.5 rounded-xl border border-ink-100 bg-white px-3 py-2.5 text-sm text-ink-800">
            <Icon name="check" size={16} stroke={2.5} class="mt-0.5 shrink-0 text-emerald-600" />
            <span>{b}</span>
          </li>
        {/each}
      </ul>
    </section>

    <section aria-label="Simulasi harga Member vs Reseller" class="rounded-2xl border border-ink-100 bg-white p-4 shadow-card lg:p-5">
      <h2 class="mb-1 font-display text-sm font-bold uppercase tracking-wide text-ink-500">Simulasi harga: Member vs Reseller</h2>
      <p class="mb-1 text-[11px] text-ink-500">Total biaya per bulan (rupiah) · asumsi 1 order = 1.000 unit layanan seharga pasar</p>
      <Chart
        labels={data.chart.labels}
        height={190}
        series={[
          { label: "Member", data: data.chart.member, color: "var(--color-ink-300)" },
          { label: "Reseller", data: data.chart.reseller, color: "var(--color-success)" },
        ]}
        formatValue={(v) => `Rp${v.toLocaleString("id-ID")}`}
      />
      <p class="mt-2 text-[11px] leading-relaxed text-ink-500">
        Dihitung dari aturan markup live di sistem kami (bukan angka promosi
        statis). Semakin sering order, semakin kelihatan bedanya.
      </p>
    </section>
  </div>

  <!-- CARA — 3 langkah -->
  <section aria-label="Cara aktivasi" class="mt-6">
    <h2 class="mb-3 font-display text-lg font-extrabold text-ink-900">Cara aktivasinya</h2>
    <ol class="grid gap-3 sm:grid-cols-3">
      {#each howSteps as step, i (i)}
        <li class="flex gap-3">
          <span
            class="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-ink-900 bg-mango-200 font-display text-sm font-extrabold tabular-nums text-ink-900"
          >
            {i + 1}
          </span>
          <span class="text-sm leading-relaxed text-ink-800">{step}</span>
        </li>
      {/each}
    </ol>
  </section>

  <!-- BIAYA AKTIVASI — saldo bonus pakai NumberFlow -->
  <section class="mt-6 flex flex-col items-start gap-4 rounded-2xl border-2 border-ink-900 bg-mango-50 p-4 shadow-[4px_4px_0_var(--color-ink-900)] sm:flex-row sm:items-center lg:p-5">
    <div class="min-w-0 flex-1">
      <p class="text-xs font-bold uppercase tracking-wide text-ink-500">Biaya aktivasi sekali</p>
      <p class="mt-1 font-display text-2xl font-extrabold tabular-nums text-ink-900">
        <NumberFlow value={data.base} format={(n) => money(n)} duration={0.9} />
      </p>
      <p class="mt-1 text-xs leading-relaxed text-ink-700 lg:text-sm">
        {money(data.base)} sudah termasuk saldo {money(data.bonus)} — net efektif
        kamu hanya membayar {money(data.base - data.bonus)} untuk aktivasi
        selamanya.
      </p>
    </div>
    {#if data.isMember && data.eligible}
      <button
        type="button"
        onclick={doUpgrade}
        disabled={busy}
        class="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-700 active:scale-[0.98] disabled:opacity-60 sm:w-auto"
      >
        <Icon name="arrow_right" size={16} stroke={2.5} />
        {busy ? "Membuat invoice…" : "Buat invoice sekarang"}
      </button>
    {/if}
  </section>

  <!-- FAQ -->
  <section aria-label="Pertanyaan umum" class="mt-6">
    <h2 class="mb-2 font-display text-lg font-extrabold text-ink-900">Sering ditanya</h2>
    <div class="divide-y divide-ink-100 border-y border-ink-100">
      {#each faq as item (item.q)}
        <details class="group py-3">
          <summary class="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink-900">
            {item.q}
            <Icon name="chevron_right" size={16} class="shrink-0 text-ink-400 transition group-open:rotate-90" />
          </summary>
          <p class="mt-2 text-sm leading-relaxed text-ink-600">{item.a}</p>
        </details>
      {/each}
    </div>
  </section>
</div>
