<script lang="ts">
  import {
    Button,
    toast,
    Icon,
    Sheet,
    revealDelay,
    SuccessTopupArt,
    EmptyBalanceArt,
  } from "@socio/ui";
  import { haptic } from "@socio/ui";
  import { copy } from "@socio/core/copy";
  import { formatRupiah } from "$lib/format";
  import { applyAction, enhance } from "$app/forms";
  import { goto } from "$app/navigation";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let amount = $state(50000);
  let custom = $state("");
  let submitting = $state(false);
  let instructionOpen = $state(false);
  let instrPostAmount = $state(0);
  let instrCredited = $state(0);
  let instrBonus = $state(0);
  let proofDepositId = $state<number | null>(null);
  let proofOpen = $state(false);

  const chips = $derived(
    data.chips?.length ? data.chips.map((v) => Number(v)) : [50000, 100000, 200000, 500000],
  );
  const popularNominal = $derived(data.popularNominal == null ? null : Number(data.popularNominal));

  function setChip(v: number) {
    haptic(8);
    amount = v;
    custom = "";
  }

  // Kode unik dihitung server (anti-salah transfer), client hanya menampilkan
  const suffix = $derived(Number(data.suffix ?? 0));
  const suffixSig = $derived(String(data.suffixSig ?? ""));
  const totalPay = $derived(amount + suffix);
  const bonusRate = $derived(Number((data as any).bonusRate ?? 0));
  const bonusPreview = $derived(Math.round(amount * bonusRate));
  const saldoMasuk = $derived(totalPay + bonusPreview);

  // Handle form result
  $effect(() => {
    if (form && (form as any).success) {
      const r = form as any;
      if (r.method === "manual") {
        instrPostAmount = r.postAmount;
        instrCredited = r.credited ?? 0;
        instrBonus = r.bonus ?? 0;
        instructionOpen = true;
      }
    }
  });

  function openProofUpload(id: number) {
    proofDepositId = id;
    proofOpen = true;
  }

  let proofFile: File | null = $state(null);

  function copyBca() {
    navigator.clipboard?.writeText(data.bcaNumber);
    haptic(8);
    toast("Nomor BCA disalin", "success");
  }
</script>

<svelte:head>
  <title>Top Up Saldo — Socio.id | Panel SMM Indonesia</title>
  <meta
    name="description"
    content="Isi saldo Socio.id via transfer bank BCA. Konfirmasi cepat oleh admin, saldo langsung masuk."
  />
</svelte:head>

<section class="space-y-5 lg:grid lg:grid-cols-[1.45fr_0.75fr] lg:gap-6 lg:space-y-0">
  <div class="lg:col-span-2 flex items-center gap-2">
    <a
      href="/saldo"
      aria-label="Kembali ke Saldo"
      class="grid h-9 w-9 place-items-center rounded-full hover:bg-ink-100 -ml-1"
    >
      <Icon name="chevron_left" size={20} />
    </a>
    <h1 class="font-display text-lg font-bold tracking-tight lg:text-[1.55rem]">Top Up Saldo</h1>
  </div>
  <div class="space-y-5">
    {#if form?.error}
      <div
        class="flex items-center gap-2 rounded-xl bg-danger/10 px-3 py-2.5 text-sm font-medium text-danger"
      >
        <Icon name="alert" size={16} />
        {form.error}
      </div>
    {/if}

    <!-- Saldo saat ini — playful -->
    <div class="card-lift rounded-2xl border border-ink-100 bg-surface p-4">
      <div class="text-xs font-medium text-ink-500">Saldo saat ini</div>
      <div class="mt-0.5 font-display text-2xl font-extrabold tabular-nums">
        {formatRupiah(Number(data.balance))}
      </div>
    </div>

    <!-- Pilih nominal -->
    <div>
      <label class="mb-2 block text-sm font-bold">{copy.topup.title}</label>
      <div class="grid grid-cols-2 gap-3">
        {#each chips as c, i (c)}
          {@const active = amount === c && !custom}
          {@const isPopular = popularNominal === c}
          <button
            type="button"
            style={revealDelay(i, 0, 40)}
            onclick={() => setChip(c)}
            class="chip-press group relative overflow-hidden rounded-2xl border-2 p-4 text-left transition-all duration-200 reveal
            {active
              ? 'border-primary bg-primary/5'
              : isPopular
                ? 'border-primary/40 bg-primary/[0.03] hover:border-primary/60'
                : 'border-ink-200 hover:border-ink-300'}"
            aria-label={`Nominal ${formatRupiah(c)}${isPopular ? " (populer)" : ""}`}
          >
            <span
              class="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full transition
                {active ? 'scale-100 bg-primary opacity-100' : 'scale-50 bg-ink-200 opacity-0'}"
            >
              <Icon name="check" size={12} stroke={3} class="text-white" />
            </span>
            <div class="font-display text-lg font-extrabold tabular-nums">{formatRupiah(c)}</div>
            {#if isPopular}
              <div class="mt-0.5 text-[10px] font-bold text-primary">Populer</div>
            {/if}
          </button>
        {/each}
      </div>

      <div class="mt-3">
        <label for="custom" class="mb-1.5 block text-xs font-semibold text-ink-600"
          >Nominal lain (min Rp20.000)</label
        >
        <div class="relative">
          <span
            class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-ink-500"
            >Rp</span
          >
          <input
            id="custom"
            type="number"
            bind:value={custom}
            oninput={() => custom && Number(custom) >= 20000 && (amount = Number(custom))}
            placeholder="50000"
            class="h-11 w-full rounded-xl border border-ink-200 pl-9 pr-3 text-sm font-bold tabular-nums outline-none transition-colors focus:border-primary"
          />
        </div>
      </div>
    </div>

    <!-- Metode pembayaran (saat ini hanya BCA — tampil sebagai info card langsung,
         bukan radio selector, supaya tidak misleading "pilih" padahal cuma 1 opsi).
         Tambah note "E-wallet & QRIS segera" supaya user paham roadmap. -->
    <div>
      <div class="mb-2 flex items-baseline justify-between">
        <label class="text-sm font-bold">Metode Pembayaran</label>
        <span class="text-[10px] font-semibold uppercase tracking-wide text-ink-400"
          >1 tersedia</span
        >
      </div>
      <div
        class="rounded-2xl border-2 border-primary bg-primary/5 p-4 shadow-[0_10px_28px_-12px_rgba(79,70,229,0.30)]"
      >
        <div class="flex items-start gap-3">
          <div
            class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-sm font-bold text-white"
            aria-hidden="true"
          >
            BCA
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-baseline justify-between gap-2">
              <div class="text-sm font-bold">Transfer Bank BCA</div>
              <span class="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-ink-50"
                >Aktif</span
              >
            </div>
            <div class="mt-0.5 text-xs text-ink-600">
              Gratis · Dikonfirmasi admin ±5 menit jam kerja
            </div>
            <div class="mt-1 text-xs text-ink-500">
              <span class="font-semibold text-ink-700">{data.bcaNumber}</span> a.n. {data.bcaName}
            </div>
            <button
              type="button"
              onclick={copyBca}
              class="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary transition-colors hover:bg-primary/20"
              aria-label="Salin nomor rekening BCA"
            >
              <Icon name="copy" size={12} stroke={2.5} />
              Salin Nomor
            </button>
          </div>
        </div>
      </div>
      <p class="mt-2 text-[11px] text-ink-500">
        <Icon name="info" size={11} class="-mt-0.5 mr-0.5 inline align-baseline" />
        E-wallet, QRIS, & kripto segera hadir.
      </p>
    </div>

    <!-- Ringkasan — playful glow -->
    <div
      class="rounded-2xl bg-ink-900 p-4 text-white shadow-[0_16px_32px_-12px_rgba(15,23,42,0.30)] hover:shadow-[0_20px_40px_-12px_rgba(15,23,42,0.38)] hover:-translate-y-0.5 transition-all duration-300"
    >
      <div class="flex items-center justify-between text-sm">
        <span class="text-ink-300">Nominal top up</span>
        <span class="tabular-nums">{formatRupiah(amount)}</span>
      </div>
      <div class="mt-1 flex items-center justify-between text-sm">
        <span class="text-ink-300">Kode unik (anti-salah transfer)</span>
        <span class="tabular-nums text-accent-300">+{suffix}</span>
      </div>
      <div class="mt-1 flex items-center justify-between text-sm">
        <span class="text-ink-300">Bonus deposit {Math.round(bonusRate * 100)}%</span>
        <span class="tabular-nums text-emerald-400">+{formatRupiah(bonusPreview)}</span>
      </div>
      <div class="mt-2 flex items-center justify-between border-t border-white/10 pt-2">
        <span class="text-sm font-semibold">Total transfer</span>
        <span class="font-display text-lg font-extrabold tabular-nums"
          >{formatRupiah(totalPay)}</span
        >
      </div>
      <div class="mt-1 flex items-center justify-between">
        <span class="text-xs text-ink-300">Saldo yang masuk</span>
        <span class="text-sm font-bold tabular-nums text-emerald-400"
          >{formatRupiah(saldoMasuk)}</span
        >
      </div>
    </div>

    <!-- Submit -->
    <form
      method="POST"
      action="?/topup"
      use:enhance={() => {
        submitting = true;
        return async ({ result }) => {
          submitting = false;
          if (result.type === "failure") {
            toast((result.data as any)?.error ?? "Gagal membuat deposit", "error");
          } else if (result.type === "success") {
            // $effect handles redirect/sheet
            await applyAction(result);
          }
        };
      }}
    >
      <input type="hidden" name="amount" value={amount} />
      <input type="hidden" name="method" value="manual" />
      <input type="hidden" name="suffix" value={suffix} />
      <input type="hidden" name="suffixSig" value={suffixSig} />
      <Button type="submit" disabled={submitting} full size="lg">
        {#if submitting}
          <Icon name="refresh" size={16} class="animate-spin" />
          Memproses…
        {:else}
          Top Up Sekarang · {formatRupiah(totalPay)}
        {/if}
      </Button>
    </form>

    <!-- Riwayat -->
    <div>
      <div class="mb-2 flex items-center justify-between">
        <h2 class="text-sm font-bold">Riwayat Top Up</h2>
        <a href="/saldo/riwayat" class="flex items-center gap-0.5 text-xs font-bold text-primary">
          Semua <Icon name="chevron_right" size={14} />
        </a>
      </div>
      {#if data.history.length === 0}
        <div
          class="rounded-2xl border border-dashed border-ink-200 bg-surface p-6 text-center lg:p-7"
        >
          <EmptyBalanceArt size={88} class="mx-auto mb-2 text-ink-300" />
          <p class="text-sm font-bold text-ink-800">{copy.empty.balance.title}</p>
          <p class="mt-1 text-xs text-ink-500">{copy.empty.balance.desc}</p>
        </div>
      {:else}
        <ul class="space-y-2 lg:space-y-3">
          {#each data.history as h (h.id)}
            <li
              class="card-lift flex items-center gap-3 rounded-2xl border border-ink-100 bg-surface px-4 py-3"
            >
              <div
                class="grid h-9 w-9 shrink-0 place-items-center rounded-lg
              {h.status === 'Success'
                  ? 'bg-success/10 text-success'
                  : h.status === 'Canceled'
                    ? 'bg-danger/10 text-danger'
                    : 'bg-amber-100 text-amber-700'}"
              >
                <Icon
                  name={h.status === "Success" ? "check" : h.status === "Canceled" ? "x" : "clock"}
                  size={18}
                />
              </div>
              <div class="min-w-0 flex-1">
                <div class="text-sm font-bold tabular-nums">{formatRupiah(Number(h.amount))}</div>
                <div class="truncate text-xs text-ink-500">
                  {h.methodName}
                  {#if h.status === "Pending" && !h.img}
                    · <button
                      type="button"
                      onclick={() => openProofUpload(h.id)}
                      class="font-semibold text-primary hover:underline">Upload Bukti</button
                    >
                  {/if}
                </div>
              </div>
              <span
                class="rounded-full px-2 py-0.5 text-[10px] font-bold
              {h.status === 'Success'
                  ? 'bg-success/10 text-success'
                  : h.status === 'Canceled'
                    ? 'bg-danger/10 text-danger'
                    : 'bg-amber-100 text-amber-700'}">{h.status}</span
              >
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>
  <!-- Sidebar: ringkasan + histori — desktop -->
  <aside class="hidden lg:block lg:sticky lg:top-20">
    <div class="surface-pop rounded-2xl border border-ink-100 bg-surface p-5">
      <div class="text-xs font-bold uppercase tracking-wide text-ink-500">Ringkas akun</div>
      <div class="mt-2 text-sm text-ink-600">
        {data.history.length ? `${data.history.length} invoice terakhir` : "Belum ada invoice"}
      </div>
      <div class="mt-4 rounded-xl bg-ink-50 p-3 text-xs text-ink-600">
        Deposit dikonfirmasi admin — ±5 menit jam kerja, ±1 jam di luar jam kerja.
      </div>
    </div>
  </aside>
</section>

<!-- Instruksi Manual BCA Sheet -->
<Sheet bind:open={instructionOpen} title="Instruksi Pembayaran">
  <div class="space-y-4">
    <div class="rounded-2xl bg-success/10 p-4 text-center">
      <SuccessTopupArt size={72} class="mx-auto text-success" />
      <div class="mt-1 text-sm font-bold text-success">Invoice Dibuat</div>
      <div class="text-xs text-ink-600">Transfer dalam 24 jam agar tidak kedaluwarsa</div>
    </div>

    <div class="rounded-2xl border border-ink-200 p-4">
      <div class="text-xs font-semibold text-ink-500">Transfer ke rekening BCA</div>
      <div class="mt-2 flex items-center justify-between">
        <div>
          <div class="font-display text-xl font-extrabold tabular-nums">{data.bcaNumber}</div>
          <div class="text-xs text-ink-600">{data.bcaName}</div>
        </div>
        <button
          type="button"
          onclick={copyBca}
          class="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary transition active:scale-90 hover:bg-primary/20"
          aria-label="Salin nomor"
        >
          <Icon name="copy" size={18} />
        </button>
      </div>
      <!-- QR scan (manual/QR) — fade-in saat data instr siap -->
      {#if instructionOpen && instrPostAmount > 0}
        <div class="mt-3 flex flex-col items-center rounded-xl bg-white p-3 reveal">
          <img
            src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=0&data={encodeURIComponent(
              `BCA ${data.bcaNumber} ${instrPostAmount}`,
            )}"
            alt="QR pembayaran BCA"
            width="180"
            height="180"
            class="h-40 w-40 rounded-lg"
            loading="lazy"
          />
          <div class="mt-2 text-[10px] text-ink-500">Scan QR di mBanking BCA</div>
        </div>
      {/if}
    </div>

    <div class="rounded-2xl bg-ink-900 p-4 text-center text-white">
      <div class="text-xs text-ink-300">Jumlah yang harus ditransfer</div>
      <div class="mt-1 font-display text-3xl font-extrabold tabular-nums">
        {formatRupiah(instrPostAmount)}
      </div>
      <div class="mt-1 text-[10px] text-accent-300">
        Termasuk kode unik untuk pencocokan otomatis
      </div>
      {#if instrCredited > 0}
        <div class="mt-3 rounded-xl bg-success/10 px-3 py-2">
          <div class="text-[11px] text-ink-300">Saldo yang masuk setelah konfirmasi</div>
          <div class="font-display text-lg font-extrabold tabular-nums text-success">
            {formatRupiah(instrCredited)}
          </div>
          {#if instrBonus > 0}
            <div class="text-[10px] text-success/80">Termasuk bonus {formatRupiah(instrBonus)}</div>
          {/if}
        </div>
      {/if}
    </div>

    <div class="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
      <strong>Penting:</strong> Transfer sesuai jumlah di atas (termasuk 3 digit terakhir). Setelah transfer,
      upload bukti di halaman riwayat top up untuk konfirmasi cepat.
    </div>

    <Button onclick={() => goto("/saldo/top-up")} class="w-full" variant="ghost">Tutup</Button>
  </div>
</Sheet>

<!-- Upload Bukti Sheet -->
<Sheet bind:open={proofOpen} title="Upload Bukti Transfer">
  <form
    method="POST"
    action="?/uploadProof"
    enctype="multipart/form-data"
    use:enhance={() => {
      return async ({ result }) => {
        if (result.type === "failure") {
          toast((result.data as any)?.error ?? "Gagal upload", "error");
        } else {
          toast("Bukti diupload", "success");
          proofDepositId = null;
          await goto("/saldo/top-up");
        }
      };
    }}
    class="space-y-4"
  >
    <input type="hidden" name="id" value={proofDepositId ?? ""} />
    <div>
      <label class="mb-2 block text-sm font-bold">Foto bukti transfer</label>
      <label
        class="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink-200 bg-ink-50 p-8 transition-colors hover:border-primary hover:bg-primary/5"
      >
        <Icon name="image" size={32} class="text-ink-500" />
        <div class="mt-2 text-sm font-semibold">Tap untuk pilih foto</div>
        <div class="text-xs text-ink-500">JPG/PNG/WebP · Max 2MB</div>
        <input
          type="file"
          name="proof"
          accept="image/jpeg,image/png,image/webp"
          class="hidden"
          onchange={(e) => {
            const f = (e.target as HTMLInputElement).files?.[0];
            if (f) proofFile = f;
          }}
        />
      </label>
      {#if proofFile}
        <div class="mt-2 text-xs text-success">✓ {proofFile.name}</div>
      {/if}
    </div>
    <Button type="submit" class="w-full" disabled={!proofFile}>Upload Bukti</Button>
  </form>
</Sheet>

<style>
  /* Press spring chips nominal — scale in-out, transform only */
  .chip-press:active {
    transform: scale(0.96);
    transition: transform 120ms cubic-bezier(0.16, 1, 0.3, 1);
  }
  @media (prefers-reduced-motion: reduce) {
    .chip-press:active {
      transform: none;
    }
  }
</style>
