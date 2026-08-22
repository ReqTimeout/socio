<script lang="ts">
  import { EmptyState } from "@socio/ui";
  import { goto } from "$app/navigation";
  import { formatRupiah } from "$lib/format";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
  let q = $state(data.q);

  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  function onSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const u = new URLSearchParams();
      if (q) u.set("q", q);
      if (data.status) u.set("status", data.status);
      goto(`/admin/affiliate?${u.toString()}`, { keepFocus: true, noScroll: true });
    }, 350);
  }
  $effect(() => {
    if (q !== data.q) q = data.q;
  });

  function setStatus(s: string) {
    const u = new URLSearchParams();
    if (data.q) u.set("q", data.q);
    if (s) u.set("status", s);
    goto(`/admin/affiliate?${u.toString()}`);
  }

  const fmtDate = (d: unknown) =>
    new Date(d as string).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const chipActive =
    "rounded-full bg-ink-900 px-3 py-1.5 text-xs font-semibold text-white transition-colors";
  const chipIdle =
    "rounded-full border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-500 transition-colors hover:border-ink-300 hover:text-ink-700";
</script>

<svelte:head>
  <title>Affiliate — Admin Socio.id</title>
</svelte:head>

<section class="space-y-6">
  <!-- Header: inline narrative (zero card chrome, no stat strip) -->
  <header>
    <h1 class="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
      Affiliate
    </h1>
    <p class="mt-1 text-sm text-ink-500">
      <span class="font-semibold text-ink-700">{data.kpi.downlines.toLocaleString("id-ID")}</span>
      downline terdaftar
      <span class="mx-1 text-ink-300">·</span>
      komisi lifetime
      <span class="font-semibold text-ink-700">{formatRupiah(data.kpi.lifetimeCommission)}</span>
      <span class="mx-1 text-ink-300">·</span>
      belum ditarik
      <span class="font-semibold text-warning">{formatRupiah(data.kpi.pendingCommission)}</span>
      <span class="mx-1 text-ink-300">·</span>
      sudah ditarik
      <span class="font-semibold text-success">{formatRupiah(data.kpi.withdrawn)}</span>
    </p>
  </header>

  <!-- Top referrer -->
  <div>
    <div class="flex items-center justify-between border-t border-ink-200 px-1 pb-2 pt-3">
      <h2 class="text-xs font-bold uppercase tracking-wide text-ink-500">Top referrer</h2>
      <span class="text-xs text-ink-400">{data.topReferrers.length} upline</span>
    </div>

    {#if data.topReferrers.length === 0}
      <EmptyState
        icon="🎁"
        title="Belum ada komisi affiliate"
        description="Komisi akan muncul di sini begitu ada downline yang menghasilkan komisi."
      />
    {:else}
      <ul class="divide-y divide-ink-100">
        {#each data.topReferrers as t, i (t.referrerId)}
          <li class="flex items-center gap-3 px-1 py-3">
            <span
              class="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold {i ===
              0
                ? 'bg-warning/15 text-warning'
                : 'bg-ink-100 text-ink-500'}">{i + 1}</span
            >
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm font-semibold text-ink-900">{t.referrer}</div>
              <div class="text-xs text-ink-400">
                {t.downlineCount} downline
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm font-bold tabular-nums text-ink-900">
                {formatRupiah(t.commission)}
              </div>
              <div class="text-[11px] text-ink-400">komisi</div>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <!-- Tabel full: filter + table desktop / card-list mobile -->
  <div>
    <div class="flex items-center justify-between border-t border-ink-200 px-1 pb-2 pt-3">
      <h2 class="text-xs font-bold uppercase tracking-wide text-ink-500">Riwayat komisi</h2>
      <span class="text-xs text-ink-400">{data.total.toLocaleString("id-ID")}</span>
    </div>

    <form method="GET" class="flex flex-wrap items-center gap-2">
      <input
        name="q"
        bind:value={q}
        oninput={onSearch}
        placeholder="Cari downline / upline…"
        class="h-10 flex-1 rounded-xl border border-ink-200 bg-surface px-3 text-sm focus:border-ink-400 focus:outline-none"
      />
      <input type="hidden" name="status" value={data.status} />
      <div class="flex gap-1.5">
        <button
          type="button"
          class={data.status === "" ? chipActive : chipIdle}
          onclick={() => setStatus("")}>Semua</button
        >
        <button
          type="button"
          class={data.status === "Pending" ? chipActive : chipIdle}
          onclick={() => setStatus("Pending")}>Pending</button
        >
        <button
          type="button"
          class={data.status === "Withdraw" ? chipActive : chipIdle}
          onclick={() => setStatus("Withdraw")}>Ditarik</button
        >
      </div>
    </form>

    {#if data.rows.length === 0}
      <div class="pt-4">
        <EmptyState
          icon="🔎"
          title="Tidak ada data"
          description="Coba ubah filter atau kata kunci pencarian."
        />
      </div>
    {:else}
      <!-- Desktop table -->
      <div class="mt-3 hidden overflow-x-auto rounded-2xl border border-ink-100 lg:block">
        <table class="w-full text-sm">
          <thead class="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th class="px-4 py-3 font-semibold">Downline</th>
              <th class="px-4 py-3 font-semibold">Upline</th>
              <th class="px-4 py-3 text-right font-semibold">Komisi</th>
              <th class="px-4 py-3 font-semibold">Status</th>
              <th class="px-4 py-3 font-semibold">Tanggal</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ink-100">
            {#each data.rows as r (r.id)}
              <tr class="hover:bg-ink-50/60">
                <td class="px-4 py-3 font-medium text-ink-900">{r.downline}</td>
                <td class="px-4 py-3 text-ink-600">{r.referrer}</td>
                <td class="px-4 py-3 text-right font-semibold tabular-nums"
                  >{formatRupiah(r.balance)}</td
                >
                <td class="px-4 py-3">
                  <span
                    class="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold {r.status ===
                    'Withdraw'
                      ? 'bg-success/10 text-success'
                      : 'bg-warning/10 text-warning'}"
                    >{r.status === "Withdraw" ? "Ditarik" : "Pending"}</span
                  >
                </td>
                <td class="px-4 py-3 text-xs text-ink-400">{fmtDate(r.createdAt)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Mobile card list -->
      <ul class="mt-3 space-y-2 lg:hidden">
        {#each data.rows as r (r.id)}
          <li class="rounded-2xl border border-ink-100 p-3">
            <div class="flex items-center justify-between gap-2">
              <span class="truncate text-sm font-semibold text-ink-900">{r.downline}</span>
              <span
                class="inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold {r.status ===
                'Withdraw'
                  ? 'bg-success/10 text-success'
                  : 'bg-warning/10 text-warning'}"
                >{r.status === "Withdraw" ? "Ditarik" : "Pending"}</span
              >
            </div>
            <div class="mt-1 flex items-center justify-between text-xs text-ink-400">
              <span>Upline: {r.referrer}</span>
              <span class="text-[11px]">{fmtDate(r.createdAt)}</span>
            </div>
            <div class="mt-1.5 text-sm font-bold tabular-nums text-ink-900">
              {formatRupiah(r.balance)}
            </div>
          </li>
        {/each}
      </ul>

      <!-- Pagination -->
      {#if data.pages > 1}
        <nav class="mt-4 flex items-center justify-between text-sm" aria-label="Pagination">
          <span class="text-xs text-ink-400">
            Hal {data.page} / {data.pages} · {data.total.toLocaleString("id-ID")} data
          </span>
          <div class="flex gap-2">
            {#if data.page > 1}
              <a
                class="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-50"
                href="?q={encodeURIComponent(data.q)}&status={encodeURIComponent(
                  data.status,
                )}&p={data.page - 1}">← Prev</a
              >
            {/if}
            {#if data.page < data.pages}
              <a
                class="rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-50"
                href="?q={encodeURIComponent(data.q)}&status={encodeURIComponent(
                  data.status,
                )}&p={data.page + 1}">Next →</a
              >
            {/if}
          </div>
        </nav>
      {/if}
    {/if}
  </div>
</section>
