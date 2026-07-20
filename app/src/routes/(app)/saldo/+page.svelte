<script lang="ts">
  import { Button, Icon } from "@socio/ui";
  import { haptic } from "@socio/ui";
  import { formatRupiah } from "$lib/format";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const logLabel: Record<string, { label: string; icon: string; tone: string }> = {
    order: { label: "Pesan", icon: "receipt", tone: "danger" },
    ref: { label: "Refund", icon: "refresh", tone: "success" },
    deposit: { label: "Top Up", icon: "plus", tone: "success" },
    wd: { label: "Withdraw", icon: "arrow_down", tone: "danger" },
    admin: { label: "Admin", icon: "settings", tone: "ink" },
  };

  function timeAgo(d: Date | string) {
    const date = typeof d === "string" ? new Date(d) : d;
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60) return "baru";
    if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
    return date.toLocaleDateString("id-ID");
  }
</script>

<section class="space-y-4">
  <!-- Balance card -->
  <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink-900 to-ink-800 p-6 text-white">
    <div class="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/20 blur-2xl"></div>
    <div class="text-xs font-medium text-ink-300">Saldo Socio</div>
    <div class="mt-1 font-display text-4xl font-extrabold tabular-nums">
      {formatRupiah(Number(data.balance))}
    </div>
    <div class="mt-4 flex gap-2">
      <a
        href="/saldo/top-up"
        class="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary py-2.5 text-sm font-bold transition active:scale-95 hover:bg-primary-700"
        onclick={() => haptic(10)}
      >
        <Icon name="plus" size={16} stroke={2.5} />
        Top Up
      </a>
      <a
        href="/saldo/riwayat"
        class="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white/10 py-2.5 text-sm font-bold transition active:scale-95 hover:bg-white/20"
        onclick={() => haptic(10)}
      >
        <Icon name="receipt" size={16} />
        Mutasi
      </a>
    </div>
  </div>

  <!-- Recent mutasi -->
  <div>
    <div class="mb-2 flex items-center justify-between">
      <h2 class="text-sm font-bold">Mutasi Terbaru</h2>
      <a href="/saldo/riwayat" class="flex items-center gap-0.5 text-xs font-bold text-primary">
        Semua <Icon name="chevron_right" size={14} />
      </a>
    </div>
    {#if data.logs.length === 0}
      <div class="rounded-2xl border border-dashed border-ink-200 bg-surface p-6 text-center text-sm text-ink-500">
        Belum ada mutasi saldo.
      </div>
    {:else}
      <ul class="space-y-2">
        {#each data.logs as l (l.id)}
          {@const meta = logLabel[l.type] ?? { label: l.type, icon: "info", tone: "ink" }}
          <li class="flex items-center gap-3 rounded-2xl border border-ink-100 bg-surface px-4 py-3">
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
            <span class="font-display text-sm font-extrabold tabular-nums {l.amount < 0 ? 'text-danger' : 'text-success'}">
              {l.amount < 0 ? "-" : "+"}{formatRupiah(Math.abs(Number(l.amount)))}
            </span>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <!-- Recent top up -->
  <div>
    <div class="mb-2 flex items-center justify-between">
      <h2 class="text-sm font-bold">Top Up Terakhir</h2>
      <a href="/saldo/top-up" class="flex items-center gap-0.5 text-xs font-bold text-primary">
        Isi <Icon name="chevron_right" size={14} />
      </a>
    </div>
    {#if data.topups.length === 0}
      <div class="rounded-2xl border border-dashed border-ink-200 bg-surface p-6 text-center text-sm text-ink-500">
        Belum ada riwayat top up.
      </div>
    {:else}
      <ul class="space-y-2">
        {#each data.topups as t (t.id)}
          <li class="flex items-center gap-3 rounded-2xl border border-ink-100 bg-surface px-4 py-3">
            <div
              class="grid h-9 w-9 shrink-0 place-items-center rounded-lg
              {t.status === 'Success'
                ? 'bg-success/10 text-success'
                : t.status === 'Canceled'
                  ? 'bg-danger/10 text-danger'
                  : 'bg-amber-100 text-amber-700'}"
            >
              <Icon name={t.status === "Success" ? "check" : t.status === "Canceled" ? "x" : "clock"} size={18} />
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
                  : 'bg-amber-100 text-amber-700'}"
              >{t.status}</span
            >
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</section>
