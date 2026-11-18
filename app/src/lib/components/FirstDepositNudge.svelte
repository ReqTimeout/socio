<script lang="ts">
  // WP6 L1 — kartu nudge "deposit pertama" di dashboard untuk user yang belum
  // pernah deposit sukses. Sebelum ini user baru hanya lihat pill kecil
  // "Saldo menipis" — tanpa penjelasan cara deposit, jadi banyak yang berhenti
  // di sini. Kartu ini: satu langkah jelas (top-up → bayar pas → saldo masuk),
  // bonus asli dari env, dan CTA langsung ke halaman bayar.
  //
  // DNA: StickerCard paper (tanpa tilt — owner: "jangan miring"), aksen mango
  // untuk reward. Ikon dompet/jam dalam sticker bulat (BUKAN instance Sparko
  // kedua — budget maskot ≤1/layar sudah dipakai halo header, ikut pola
  // CouponTicket). Satu gerak kontinu saja (bob sticker) + langkah stagger
  // sekali masuk; semua ada fallback prefers-reduced-motion. Token saja.
  // Dismiss disimpan per browser (localStorage) — tidak mengganggu user yang
  // memang belum mau deposit; banner /saldo tetap ada untuk invoice pending.
  // Copy inline di sini (guardrail copy.ts: dilarang tambah key katalog).
  import { Icon, StickerCard, StickerBadge, haptic } from "@socio/ui";
  import { onMount } from "svelte";
  import { formatRupiah } from "$lib/format";
  import type { FirstDepositNudge } from "$lib/server/first-deposit";

  const DISMISS_KEY = "socio-nudge-firstDeposit";

  const copy = {
    badge: "Mulai di sini",
    title: "Satu top-up lagi menuju pesanan pertamamu",
    desc: "Top up lewat transfer BCA: bayar nominal persis, saldo masuk setelah admin verifikasi.",
    steps: [
      "Pilih nominal — kamu dapat rekening BCA dan total persis dengan kode unik 3 digit.",
      "Transfer total persis itu ke rekening BCA (3 digit terakhir mencocokkannya ke akunmu).",
      "Saldo + bonus masuk setelah admin verifikasi, lalu buat pesanan pertama.",
    ],
    bonusNote: (pct: number) => `Setiap top-up dapat bonus ${pct}%`,
    minNote: (min: string) => `Top-up minimum ${min}`,
    cta: "Top up sekarang",
    pendingTitle: "Top-up pertamamu menunggu pembayaran",
    pendingDesc: (amount: string) =>
      `Bayar persis ${amount} lewat transfer BCA untuk mengaktifkan saldomu.`,
    pendingCta: "Lihat invoice & bayar",
    dismissAria: "Tutup pengingat top-up pertama",
  };

  let { nudge }: { nudge: FirstDepositNudge } = $props();
  let dismissed = $state(false);

  onMount(() => {
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      // storage diblokir — kartu tetap tampil (tidak kritis)
    }
    const id = setInterval(() => {
      if (!document.hidden) now = Date.now();
    }, 30_000);
    return () => clearInterval(id);
  });

  function dismiss() {
    haptic(6);
    dismissed = true;
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // storage diblokir — dismiss untuk sesi ini saja
    }
  }

  // Hitungan waktu live untuk invoice pending (tick 30s, berhenti saat tab hidden).
  let now = $state(Date.now());
  const leftText = $derived.by(() => {
    if (nudge.stage !== "pending" || !nudge.expireAt) return null;
    const s = Math.floor((new Date(nudge.expireAt).getTime() - now) / 1000);
    if (s <= 0) return "Kedaluwarsa";
    if (s < 3600) return `Sisa ${Math.floor(s / 60)} mnt`;
    if (s < 86400) return `Sisa ${Math.floor(s / 3600)} jam ${Math.floor((s % 3600) / 60)} mnt`;
    return `Sisa ${Math.floor(s / 86400)} hari`;
  });

  const isPending = $derived(nudge.stage === "pending");
  const href = $derived(isPending ? "/saldo" : "/saldo/top-up");
  const ctaLabel = $derived(isPending ? copy.pendingCta : copy.cta);
</script>

{#if !dismissed}
  <div class="fd-nudge">
    <StickerCard tone="paper" tilt={0} class="relative overflow-hidden">
      <span
        class="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-mango-soft/70 blur-2xl"
        aria-hidden="true"
      ></span>

      <div class="relative flex items-start gap-3 p-4 sm:gap-4 sm:p-5">
        <span
          class="fd-art grid h-12 w-12 shrink-0 place-items-center rounded-2xl border-2 border-ink-900 bg-mango-soft text-mango-ink shadow-[2px_2px_0_var(--color-ink-900)] sm:h-14 sm:w-14"
          aria-hidden="true"
        >
          <Icon name={isPending ? "clock" : "wallet"} size={24} stroke={2.25} />
        </span>

        <div class="min-w-0 flex-1">
          <div class="flex items-start gap-2">
            <StickerBadge tone={isPending ? "accent" : "mango"} class="mb-1.5">
              <Icon name={isPending ? "clock" : "sparkles"} size={11} stroke={2.5} />
              {copy.badge}
            </StickerBadge>
            <button
              type="button"
              onclick={dismiss}
              aria-label={copy.dismissAria}
              class="ml-auto -mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <Icon name="x" size={15} stroke={2.5} />
            </button>
          </div>

          <h2 class="font-display text-[15px] font-extrabold leading-tight text-ink-900 sm:text-lg">
            {isPending ? copy.pendingTitle : copy.title}
          </h2>

          {#if isPending}
            <div class="mt-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <span class="font-display text-2xl font-extrabold tabular-nums text-ink-900">
                {formatRupiah(nudge.amount)}
              </span>
              {#if leftText}
                <span
                  class="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold tabular-nums text-amber-800"
                >
                  {leftText}
                </span>
              {/if}
            </div>
            <p class="mt-1.5 text-xs leading-relaxed text-ink-600 sm:text-[13px]">
              {copy.pendingDesc(formatRupiah(nudge.amount))}
            </p>
          {:else}
            <p class="mt-1 text-xs leading-relaxed text-ink-600 sm:text-[13px]">{copy.desc}</p>
            <ol class="mt-2.5 space-y-1.5">
              {#each copy.steps as step, i (i)}
                <li
                  class="fd-step flex items-start gap-2 text-[12px] leading-snug text-ink-700"
                  style="--d: {i * 90}ms"
                >
                  <span
                    class="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-ink-900 text-[10px] font-bold tabular-nums text-white"
                    >{i + 1}</span
                  >
                  <span class="min-w-0">{step}</span>
                </li>
              {/each}
            </ol>
          {/if}

          <div class="mt-3 flex flex-wrap items-center gap-2">
            <a
              {href}
              onclick={() => haptic(10)}
              class="fd-cta group inline-flex min-h-[44px] items-center gap-1.5 rounded-full border-2 border-ink-900 bg-primary px-4 py-2 text-sm font-bold text-white shadow-[2px_2px_0_var(--color-ink-900)] transition-all hover:-translate-y-0.5 hover:shadow-[3px_3px_0_var(--color-ink-900)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              <Icon name={isPending ? "grid" : "wallet"} size={16} stroke={2.5} />
              {ctaLabel}
              <span class="fd-arrow inline-flex" aria-hidden="true">
                <Icon name="chevron_right" size={15} stroke={2.5} />
              </span>
            </a>
            {#if !isPending && nudge.bonusPct > 0}
              <span
                class="inline-flex items-center gap-1 rounded-full bg-mango-soft px-2.5 py-1 text-[11px] font-extrabold text-mango-ink"
              >
                <Icon name="gift" size={12} stroke={2.5} />
                {copy.bonusNote(nudge.bonusPct)}
              </span>
            {/if}
            {#if !isPending}
              <span class="text-[11px] font-semibold text-ink-500">
                {copy.minNote(formatRupiah(nudge.minTopup))}
              </span>
            {/if}
          </div>
        </div>
      </div>
    </StickerCard>
  </div>
{/if}

<style>
  /* Masuk lembut sekali + sticker bob kontinu (transform-only, GPU-friendly).
     Budget infinite ≤2/layar: kartu ini menyumbang SATU saja (anak panah CTA
     bergerak saat hover, bukan loop). Reduced-motion: semua gerak dimatikan,
     kartu tetap terbaca penuh. */
  .fd-nudge {
    animation: fd-pop 420ms var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)) both;
  }
  @keyframes fd-pop {
    from {
      opacity: 0;
      transform: translateY(6px) scale(0.985);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  .fd-art {
    animation: fd-bob 3.6s ease-in-out infinite;
  }
  @keyframes fd-bob {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-3px);
    }
  }
  .fd-step {
    animation: fd-step-in 360ms var(--ease-out-soft, cubic-bezier(0.16, 1, 0.3, 1)) both;
    animation-delay: var(--d, 0ms);
  }
  @keyframes fd-step-in {
    from {
      opacity: 0;
      transform: translateX(-4px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  .fd-arrow {
    transition: transform 220ms var(--ease-out-soft, cubic-bezier(0.16, 1, 0.3, 1));
  }
  .fd-cta:hover .fd-arrow,
  .fd-cta:focus-visible .fd-arrow {
    transform: translateX(3px);
  }
  @media (prefers-reduced-motion: reduce) {
    .fd-nudge,
    .fd-art,
    .fd-step {
      animation: none;
    }
    .fd-arrow {
      transition: none;
    }
    .fd-cta:hover .fd-arrow,
    .fd-cta:focus-visible .fd-arrow {
      transform: none;
    }
    .fd-cta,
    .fd-cta:hover,
    .fd-cta:active {
      transform: none;
      transition: none;
    }
  }
</style>
