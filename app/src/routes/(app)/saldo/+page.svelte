<script lang="ts">
  import { Icon } from "@socio/ui";
  import { haptic } from "@socio/ui";
  import { formatRupiah, formatDateShort } from "$lib/format";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const logLabel: Record<string, { label: string; icon: string; tone: string }> = {
    order: { label: "Pesan", icon: "receipt", tone: "danger" },
    ref: { label: "Refund", icon: "refresh", tone: "success" },
    deposit: { label: "Top Up", icon: "plus", tone: "success" },
    wd: { label: "Withdraw", icon: "arrow_down", tone: "danger" },
    admin: { label: "Admin", icon: "settings", tone: "ink" },
    // Legacy PHP: type 'plus'/'minus', amount selalu positif
    plus: { label: "Masuk", icon: "arrow_down", tone: "success" },
    minus: { label: "Keluar", icon: "receipt", tone: "danger" },
  };

  // Arah transaksi legacy ditentukan type, bukan tanda amount
  // (lihat app.socio.id/order/new-action.php — amount positif + type 'minus').
  function isOutLog(l: { type: string; amount: number | string }) {
    const amt = Number(l.amount);
    return l.type === "minus" || l.type === "wd" || l.type === "order" || amt < 0;
  }

  function timeAgo(d: Date | string) {
    const date = typeof d === "string" ? new Date(d) : d;
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60) return "baru";
    if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
    return formatDateShort(date);
  }
</script>

<svelte:head>
  <title>Saldo — Socio.id | Panel SMM Indonesia</title>
  <meta
    name="description"
    content="Kelola saldo Socio.id kamu. Top up via BCA, Midtrans VA, atau QRIS. Riwayat transaksi lengkap."
  />
</svelte:head>

<section class="space-y-4 lg:space-y-5">
  <!-- Balance card — playful premium with glow shadow -->
  <div
    class="relative overflow-hidden rounded-2xl lg:rounded-3xl bg-gradient-to-br from-ink-900 via-ink-900 to-ink-800 p-5 lg:p-8 text-white lg:grid lg:grid-cols-[1.35fr_auto] lg:items-center lg:gap-8 shadow-[0_16px_40px_-16px_rgba(15,23,42,0.35),0_8px_16px_-8px_rgba(79,70,229,0.20)] hover:shadow-[0_20px_48px_-16px_rgba(15,23,42,0.40),0_10px_20px_-8px_rgba(79,70,229,0.25)] transition-all duration-300 hover:-translate-y-0.5"
  >
    <div
      class="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/20 blur-2xl pointer-events-none"
    ></div>
    <div class="min-w-0">
      <div class="text-xs font-medium text-ink-300 lg:text-[13px]">Saldo Socio</div>
      <div
        class="mt-1 font-display text-3xl lg:text-[2.85rem] lg:leading-none font-extrabold tabular-nums truncate"
      >
        {formatRupiah(Number(data.balance))}
      </div>
    </div>
    <div class="mt-4 lg:mt-0 flex gap-2 lg:flex-col lg:w-44">
      <a
        href="/saldo/top-up"
        class="flex flex-1 lg:flex-none items-center justify-center gap-1.5 rounded-full bg-primary py-2.5 text-sm font-bold transition active:scale-95 hover:bg-primary-700"
        onclick={() => haptic(10)}
      >
        <Icon name="plus" size={16} stroke={2.5} />
        Top Up
      </a>
      <a
        href="/saldo/riwayat"
        class="flex flex-1 lg:flex-none items-center justify-center gap-1.5 rounded-full bg-white/10 py-2.5 text-sm font-bold transition active:scale-95 hover:bg-white/20"
        onclick={() => haptic(10)}
      >
        <Icon name="receipt" size={16} />
        Mutasi
      </a>
    </div>
  </div>

  <!-- min-w-0 wajib: grid item default min-width auto — konten flex (note panjang
       + amount) tak bisa shrink → track melar 444px di 390px viewport (overflow 70px) -->
  <div class="grid min-w-0 gap-4 lg:grid-cols-2 lg:gap-5 lg:items-start">
    <!-- Recent mutasi — preview 5 + single entry ke riwayat penuh (konsisten) -->
    <div class="min-w-0">
      <div class="mb-2 flex items-center justify-between">
        <h2 class="text-sm font-bold lg:text-[15px]">Mutasi Terbaru</h2>
        <a
          href="/saldo/riwayat"
          class="inline-flex items-center gap-1 rounded-full bg-ink-900 px-3 py-1.5 text-xs font-bold text-white transition active:scale-95 hover:bg-ink-800"
        >
          Lihat semua <Icon name="chevron_right" size={14} />
        </a>
      </div>
      <p class="mb-2 text-xs text-ink-500">Preview 5 transaksi · warna menandai masuk/keluar</p>
      {#if data.logs.length === 0}
        <div
          class="rounded-2xl border border-dashed border-ink-200 bg-surface p-6 text-center text-sm text-ink-500"
        >
          Belum ada mutasi saldo.
        </div>
      {:else}
        <ul class="space-y-2">
          {#each data.logs as l (l.id)}
            {@const meta = logLabel[l.type] ?? { label: l.type, icon: "info", tone: "ink" }}
            {@const out = isOutLog(l)}
            <li
              class="card-lift flex items-center gap-3 rounded-2xl border border-ink-100 bg-surface px-4 py-3"
            >
              <div
                class="grid h-9 w-9 shrink-0 place-items-center rounded-lg
              {meta.tone === 'success'
                  ? 'bg-success/10 text-success'
                  : meta.tone === 'danger'
                    ? 'bg-danger/10 text-danger'
                    : 'bg-ink-100 text-ink-500'}"
              >
                <Icon name={meta.icon} size={18} />
              </div>
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-bold">{l.note}</div>
                <div class="text-xs text-ink-400">{timeAgo(l.createdAt)}</div>
              </div>
              <span
                class="font-display text-sm font-extrabold tabular-nums {out
                  ? 'text-danger'
                  : 'text-success'}"
              >
                {out ? "-" : "+"}{formatRupiah(Math.abs(Number(l.amount)))}
              </span>
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    <!-- Recent top up -->
    <div class="min-w-0">
      <div class="mb-2 flex items-center justify-between">
        <h2 class="text-sm font-bold lg:text-[15px]">Top Up Terakhir</h2>
        <a href="/saldo/top-up" class="flex items-center gap-0.5 text-xs font-bold text-primary">
          Isi <Icon name="chevron_right" size={14} />
        </a>
      </div>
      {#if data.topups.length === 0}
        <div
          class="rounded-2xl border border-dashed border-ink-200 bg-surface p-6 text-center text-sm text-ink-500"
        >
          Belum ada riwayat top up.
        </div>
      {:else}
        <ul class="space-y-2">
          {#each data.topups as t (t.id)}
            <li
              class="card-lift flex items-center gap-3 rounded-2xl border border-ink-100 bg-surface px-4 py-3"
            >
              <div
                class="grid h-9 w-9 shrink-0 place-items-center rounded-lg
              {t.status === 'Success'
                  ? 'bg-success/10 text-success'
                  : t.status === 'Canceled'
                    ? 'bg-danger/10 text-danger'
                    : 'bg-amber-100 text-amber-700'}"
              >
                <Icon
                  name={t.status === "Success" ? "check" : t.status === "Canceled" ? "x" : "clock"}
                  size={18}
                />
              </div>
              <div class="min-w-0 flex-1">
                <div class="text-sm font-bold tabular-nums">{formatRupiah(Number(t.amount))}</div>
                <div class="truncate text-xs text-ink-500">{t.methodName}</div>
              </div>
              <span
                class="rounded-full px-2 py-0.5 text-[10px] font-bold
              {t.status === 'Success'
                  ? 'bg-success/10 text-success'
                  : t.status === 'Canceled'
                    ? 'bg-danger/10 text-danger'
                    : 'bg-amber-100 text-amber-700'}">{t.status}</span
              >
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>
</section>
