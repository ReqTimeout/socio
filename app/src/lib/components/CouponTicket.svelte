<script lang="ts">
  // Kupon PUBLIK aktif (tabel `coupons`, kode global seperti SOCIO11) jadi
  // satu strip tiket compact di dashboard — BUKAN stamp card berjenjang
  // (itu `user_coupons`/CouponStampCard, belum ada di .id). Auto-muncul/hilang
  // mengikuti baris kupon: loader menyaring active + belum tamat + kuota belum
  // habis, jadi tanpa kupon strip tidak render apa pun (tidak makan ruang).
  //
  // DNA: StickerCard paper (border tinta + hard-shadow, TANPA tilt — owner:
  // "jangan miring"), aksen mango (reward). Micro-animation: shine sweep,
  // glow pulse stub, pop angka, dot kedaluwarsa berdenyut, hover-lift + arrow
  // geser — semua ada fallback prefers-reduced-motion. Warna HANYA token
  // (mango-*, ink-*, primary, surface, sparko-mango-soft) — nol hex literal.
  // Ikon "ticket" (bukan instance Sparko kedua — budget maskot ≤1/layar sudah
  // dipakai halo header). Compact: satu baris, truncate aman di mobile.
  // Copy inline di sini (guardrail copy.ts: dilarang tambah key katalog).
  import { Icon, haptic, StickerCard } from "@socio/ui";
  import { formatRupiah } from "$lib/format";

  export type PromoCoupon = {
    code: string;
    type: "percent" | "fixed";
    value: number;
    minOrder: number;
    hasExpiry: boolean;
    daysLeft: number;
  };

  const copy = {
    eyebrow: "Kupon aktif",
    off: "diskon",
    minLabel: (amount: string) => `Min. ${amount}`,
    noMin: "Tanpa minimum",
    expiresIn: (days: number) => `Berakhir dalam ${days} hari`,
    expiresSoon: "Berakhir hari ini",
    copy: "Salin",
    copied: "Tersalin",
    useCta: "Pakai sekarang",
  };

  let { coupon, href = "/pesan" }: { coupon: PromoCoupon | null; href?: string } = $props();

  let copied = $state(false);

  /** Label diskon: percent → "10%", fixed → "Rp5.000" (IDR, bukan sen MYR). */
  function discountLabel(c: PromoCoupon): string {
    const v = Number(c.value) || 0;
    return c.type === "percent" ? `${Math.round(v)}%` : formatRupiah(v);
  }

  const discount = $derived(coupon ? discountLabel(coupon) : "");
  const minText = $derived(
    coupon ? (coupon.minOrder > 0 ? copy.minLabel(formatRupiah(coupon.minOrder)) : copy.noMin) : "",
  );
  const expiryText = $derived(
    !coupon || !coupon.hasExpiry
      ? ""
      : coupon.daysLeft <= 1
        ? copy.expiresSoon
        : copy.expiresIn(coupon.daysLeft),
  );

  async function copyCode() {
    if (!coupon) return;
    haptic(8);
    try {
      await navigator.clipboard.writeText(coupon.code);
      copied = true;
      setTimeout(() => (copied = false), 1600);
    } catch {
      // clipboard boleh gagal — kode tetap terbaca di layar
    }
  }
</script>

{#if coupon}
  <div class="coupon-ticket group/ticket">
    <div class="ct-card relative overflow-hidden">
      <StickerCard tone="paper" tilt={0} class="relative overflow-hidden">
        <!-- sapu kilau (shine) melintas — murni dekoratif -->
        <span class="ct-shine" aria-hidden="true"></span>
        <!-- blob mango soft, sedikit bergerak -->
        <span
          class="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-mango-soft/70 blur-2xl"
          aria-hidden="true"
        ></span>

        <div class="relative flex items-stretch gap-2.5 px-3 py-2.5 lg:gap-3 lg:px-4">
          <!-- STUB diskon mango + glow berdenyut + pop angka -->
          <div
            class="ct-stub relative grid shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-mango-400 to-mango-500 px-2.5 py-1.5 text-center"
          >
            <span
              class="ct-spark pointer-events-none absolute right-1 top-1 inline-flex text-ink-900/45"
            >
              <Icon name="sparkles" size={13} />
            </span>
            <span
              class="ct-num font-display text-[16px] font-extrabold leading-none tabular-nums text-ink-900 lg:text-xl"
            >
              {discount}
            </span>
            <span class="mt-0.5 text-[8.5px] font-bold uppercase tracking-wide text-ink-900/70">
              {copy.off}
            </span>
          </div>

          <!-- PERFORASI tiket: garis putus + punch-hole warna surface -->
          <div class="ct-perf relative shrink-0" aria-hidden="true">
            <span class="ct-perf-hole ct-perf-hole--top"></span>
            <span class="ct-perf-hole ct-perf-hole--bottom"></span>
          </div>

          <!-- BODY -->
          <div class="grid min-w-0 flex-1 content-center gap-0.5">
            <p
              class="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-700"
            >
              <span class="ct-float inline-flex">
                <Icon name="ticket" size={11} stroke={2.4} />
              </span>
              {copy.eyebrow}
            </p>
            <div class="flex items-center gap-2">
              <button
                type="button"
                onclick={copyCode}
                title={copied ? copy.copied : copy.copy}
                class="inline-flex min-w-0 items-center gap-1.5 rounded-lg border-2 border-dashed border-amber-300 bg-surface px-2 py-0.5 transition active:scale-[0.98]"
                class:ct-copied={copied}
              >
                <span
                  class="truncate font-display text-sm font-extrabold tracking-wider tabular-nums text-ink-900"
                >
                  {coupon.code}
                </span>
                <Icon name={copied ? "check" : "copy"} size={12} class="shrink-0 text-ink-500" />
              </button>
              <span class="truncate text-[10.5px] font-medium text-ink-500">
                {minText}
              </span>
            </div>
            {#if expiryText}
              <p class="flex items-center gap-1.5 text-[10px] font-semibold text-rose-600">
                <span class="ct-live" aria-hidden="true"></span>
                {expiryText}
              </p>
            {/if}
          </div>

          <!-- CTA -->
          <a
            {href}
            onclick={() => haptic(10)}
            class="inline-flex shrink-0 items-center self-center gap-1 rounded-full border-2 border-ink-900 bg-primary px-3 py-1.5 text-[11px] font-bold text-white shadow-[2px_2px_0_var(--color-ink-900)] transition-all hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
          >
            {copy.useCta}
            <Icon
              name="chevron_right"
              size={13}
              class="transition-transform duration-200 group-hover/ticket:translate-x-0.5"
            />
          </a>
        </div>
      </StickerCard>
    </div>
  </div>
{/if}

<style>
  /* hover-lift + shadow dalam (desktop) — bukan tilt */
  .ct-card {
    border-radius: var(--radius-sticker);
    transition:
      transform 0.2s var(--ease-spring, cubic-bezier(0.16, 1, 0.3, 1)),
      box-shadow 0.2s ease;
  }
  @media (hover: hover) and (min-width: 1024px) {
    .coupon-ticket:hover .ct-card {
      transform: translateY(-2px);
    }
  }

  /* sapu kilau melintas diagonal (sekali tiap ~4.5s) */
  .ct-shine {
    position: absolute;
    inset: 0 auto 0 -40%;
    width: 40%;
    pointer-events: none;
    background: linear-gradient(100deg, transparent, rgb(255 255 255 / 0.55), transparent);
    transform: translateX(-120%);
    animation: ct-shine 4.5s var(--ease-spring, cubic-bezier(0.16, 1, 0.3, 1)) infinite;
    z-index: 2;
  }
  @keyframes ct-shine {
    0% {
      transform: translateX(-120%);
    }
    55%,
    100% {
      transform: translateX(360%);
    }
  }

  /* stub: halo mango berdenyut (pakai token sparko-mango-soft, nol hex) */
  .ct-stub {
    box-shadow:
      1.5px 1.5px 0 var(--color-ink-900),
      0 0 0 0 var(--sparko-mango-soft);
    animation: ct-stub-glow 2.4s ease-out infinite;
  }
  @keyframes ct-stub-glow {
    0% {
      box-shadow:
        1.5px 1.5px 0 var(--color-ink-900),
        0 0 0 0 var(--sparko-mango-soft);
    }
    70%,
    100% {
      box-shadow:
        1.5px 1.5px 0 var(--color-ink-900),
        0 0 0 7px rgb(255 255 255 / 0);
    }
  }
  /* angka pop masuk 1× */
  .ct-num {
    animation: ct-num-pop 620ms var(--ease-spring, cubic-bezier(0.16, 1, 0.3, 1)) both;
  }
  @keyframes ct-num-pop {
    0% {
      transform: scale(0.5);
      opacity: 0;
    }
    70% {
      transform: scale(1.12);
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }
  .ct-spark {
    animation: ct-spark 2.8s ease-in-out infinite;
  }
  @keyframes ct-spark {
    0%,
    100% {
      opacity: 0.25;
      transform: scale(0.85) rotate(0deg);
    }
    50% {
      opacity: 0.85;
      transform: scale(1.15) rotate(12deg);
    }
  }

  /* perforasi tiket: garis putus + punch-hole warna surface (theme-safe) */
  .ct-perf {
    width: 0;
    align-self: stretch;
    border-left: 2px dashed var(--color-ink-200);
  }
  .ct-perf-hole {
    position: absolute;
    left: -6px;
    width: 10px;
    height: 10px;
    border-radius: 9999px;
    background: var(--color-surface);
    box-shadow: inset 0 0 0 1px var(--color-ink-100);
  }
  .ct-perf-hole--top {
    top: -6px;
  }
  .ct-perf-hole--bottom {
    bottom: -6px;
  }

  /* ikon tiket float halus */
  .ct-float {
    animation: ct-float 3.2s ease-in-out infinite;
  }
  @keyframes ct-float {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-1px);
    }
  }

  /* dot kedaluwarsa berdenyut (live) */
  .ct-live {
    inline-size: 6px;
    block-size: 6px;
    border-radius: 9999px;
    background: currentColor;
    animation: ct-live 1.5s ease-in-out infinite;
  }
  @keyframes ct-live {
    0%,
    100% {
      opacity: 0.4;
      transform: scale(0.85);
    }
    50% {
      opacity: 1;
      transform: scale(1.25);
    }
  }

  /* umpan balik saat kode disalin: ring hijau singkat */
  .ct-copied {
    border-color: var(--color-primary-500);
  }

  @media (prefers-reduced-motion: reduce) {
    .ct-shine,
    .ct-stub,
    .ct-num,
    .ct-spark,
    .ct-float,
    .ct-live {
      animation: none;
    }
    .ct-shine {
      display: none;
    }
    .ct-card {
      transition: none;
    }
  }
</style>
