<script lang="ts">
  import { toast, Icon, extractActionMsg } from "@socio/ui";
  import { applyAction, enhance } from "$app/forms";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  let q = $state("");
  let kindFilter = $state("all");
  let onlyRouted = $state(false);

  const KINDS = [
    "all",
    "followers",
    "likes",
    "views",
    "comments",
    "live",
    "watchtime",
    "subscribers",
    "shares",
    "sound",
    "generic",
  ];

  const filtered = $derived(
    data.rows.filter((r: any) => {
      if (kindFilter !== "all" && r.kind !== kindFilter) return false;
      if (onlyRouted && r.state !== "routed") return false;
      if (!q.trim()) return true;
      const needle = q.trim().toLowerCase();
      return (
        String(r.name).toLowerCase().includes(needle) ||
        r.providerNames.some((n: string) => n.toLowerCase().includes(needle))
      );
    }),
  );

  const routedCount = $derived(data.rows.filter((r: any) => r.state === "routed").length);
  const activeProvider = $derived(data.providers.find((p: any) => p.active)?.name ?? "—");

  const STATE_LABEL: Record<string, { text: string; cls: string }> = {
    routed: { text: "DI-ROUTE", cls: "bg-violet-100 text-violet-700" },
    "active-global": { text: "PROVIDER AKTIF", cls: "bg-emerald-100 text-emerald-700" },
    "off-manual": { text: "MATI (MANUAL)", cls: "bg-ink-100 text-ink-600" },
    inactive: { text: "NON-AKTIF", cls: "bg-ink-100 text-ink-500" },
  };

  function providerName(id: number | null): string {
    if (id === null) return "—";
    return data.providers.find((p: any) => p.id === id)?.name ?? `#${id}`;
  }

  const fmt = (n: number) => Number(n ?? 0).toLocaleString("id-ID");
</script>

<svelte:head>
  <title>Routing Provider — Admin Socio.id</title>
</svelte:head>

<section class="space-y-5">
  <header class="flex flex-wrap items-start justify-between gap-3">
    <div class="min-w-0 flex-1">
      <h1
        class="flex items-center gap-2.5 font-display text-2xl font-extrabold tracking-tight text-ink-900 sm:text-[28px]"
      >
        <span class="grid h-10 w-10 place-items-center rounded-2xl bg-ink-900 text-ink-50 shadow-sm">
          <Icon name="share" size={18} stroke={2.5} />
        </span>
        Routing Provider
        <span
          class="hidden sm:inline-flex items-center gap-1 rounded-full bg-ink-900 px-2.5 py-1 text-[11px] font-bold tracking-wide text-ink-50"
        >
          {fmt(data.rows.length)} kategori
        </span>
      </h1>
      <p class="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs font-medium text-ink-500">
        <span
          class="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-surface px-2.5 py-1"
        >
          <span class="h-1.5 w-1.5 rounded-full bg-ink-900"></span>
          Aktif: {activeProvider}
        </span>
        <span
          class="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-700"
        >
          <span class="h-1.5 w-1.5 rounded-full bg-violet-500"></span>
          {fmt(routedCount)} kategori di-route
        </span>
      </p>
      <p class="mt-2 max-w-prose text-xs leading-relaxed text-ink-500">
        Kategori yang di-route dilayani provider khusus (mis. TikTok → provider kedua).
        Kategori tanpa routing mengikuti provider aktif global. Markup tetap sama
        untuk semua kategori — yang berubah hanya sumber layanan & harganya.
      </p>
    </div>
  </header>

  {#if form?.success}
    <div class="rounded-xl bg-success/10 px-3 py-2 text-sm font-medium text-success">
      {form.success}
    </div>
  {/if}
  {#if form?.error}
    <div class="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
      {form.error}
    </div>
  {/if}

  <!-- Filter -->
  <div class="flex flex-wrap items-center gap-2">
    <label class="relative min-w-[200px] flex-1">
      <span class="sr-only">Cari kategori</span>
      <span
        class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
      >
        <Icon name="search" size={15} />
      </span>
      <input
        type="search"
        bind:value={q}
        placeholder="Cari kategori atau provider…"
        class="w-full rounded-xl border border-ink-200 bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
      />
    </label>
    <select
      bind:value={kindFilter}
      class="rounded-xl border border-ink-200 bg-surface px-3 py-2 text-sm font-semibold text-ink-700 outline-none focus:border-violet-500"
      aria-label="Filter jenis layanan"
    >
      {#each KINDS as k (k)}
        <option value={k}>{k === "all" ? "Semua jenis" : k}</option>
      {/each}
    </select>
    <button
      type="button"
      onclick={() => (onlyRouted = !onlyRouted)}
      class="rounded-xl border px-3 py-2 text-sm font-bold transition {onlyRouted
        ? 'border-violet-300 bg-violet-50 text-violet-700'
        : 'border-ink-200 bg-surface text-ink-600 hover:bg-ink-50'}"
    >
      <Icon name="filter" size={14} class="mr-1 inline" />
      Hanya di-route
    </button>
  </div>

  <!-- Tabel -->
  <div class="overflow-hidden rounded-2xl border border-ink-100 bg-surface">
    <div class="flex items-center justify-between border-b border-ink-100 bg-ink-50/40 px-4 py-2.5">
      <h2 class="text-xs font-bold uppercase tracking-wide text-ink-500">Kategori</h2>
      <span class="rounded-full bg-ink-900 px-2 py-0.5 text-[11px] font-bold text-ink-50">
        {fmt(filtered.length)}
      </span>
    </div>

    {#if filtered.length === 0}
      <p class="px-4 py-8 text-center text-sm text-ink-500">
        Tidak ada kategori yang cocok dengan filter.
      </p>
    {:else}
      <div class="hidden lg:block">
        <table class="w-full min-w-[900px] text-sm">
          <thead class="sticky top-0 z-10 bg-ink-50/80 backdrop-blur">
            <tr
              class="border-b border-ink-100 text-left text-[11px] font-bold uppercase tracking-wide text-ink-400"
            >
              <th class="px-4 py-2.5">Kategori</th>
              <th class="px-2 py-2.5">Jenis</th>
              <th class="px-2 py-2.5">Provider</th>
              <th class="px-2 py-2.5 text-center">Layanan</th>
              <th class="px-2 py-2.5">Status</th>
              <th class="px-4 py-2.5 text-right">Routing</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ink-100">
            {#each filtered as r (r.id)}
              {@const st = STATE_LABEL[r.state] ?? STATE_LABEL.inactive}
              <tr class="transition-colors hover:bg-ink-50/60">
                <td class="px-4 py-3">
                  <p class="font-bold text-ink-900">{r.name}</p>
                  <p class="font-mono text-[11px] text-ink-400">#{r.id}</p>
                </td>
                <td class="px-2 py-3">
                  <span
                    class="inline-flex rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-bold text-ink-600"
                  >
                    {r.kind}
                  </span>
                </td>
                <td class="px-2 py-3 text-xs text-ink-600">
                  {r.providerNames.length ? r.providerNames.join(", ") : "—"}
                </td>
                <td class="px-2 py-3 text-center tabular-nums text-ink-700">
                  {fmt(r.active)}<span class="text-ink-400">/{fmt(r.total)}</span>
                </td>
                <td class="px-2 py-3">
                  <span
                    class="inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold {st.cls}"
                  >
                    {st.text}
                  </span>
                  {#if r.routingProviderId !== null}
                    <span class="ml-1 text-[11px] text-ink-500">→ {providerName(r.routingProviderId)}</span>
                  {/if}
                </td>
                <td class="px-4 py-3">
                  <form
                    method="POST"
                    action="?/setRouting"
                    use:enhance={() =>
                      async ({ result }) => {
                        const j = result as any;
                        const ok = result.type !== "failure";
                        toast(extractActionMsg(j.data) ?? (ok ? "OK" : "Gagal"), ok ? "success" : "error");
                        if (ok) await applyAction(result);
                      }}
                    class="flex items-center justify-end gap-1.5"
                  >
                    <input type="hidden" name="categoryId" value={r.id} />
                    <select
                      name="providerId"
                      class="rounded-lg border border-ink-200 bg-surface px-2 py-1.5 text-xs font-semibold text-ink-700 outline-none focus:border-violet-500"
                      aria-label="Provider untuk kategori {r.name}"
                    >
                      <option value="">Ikut provider aktif</option>
                      {#each data.providers as p (p.id)}
                        <option value={p.id} selected={r.routingProviderId === p.id}>
                          {p.name}{p.active ? " (aktif)" : ""}
                        </option>
                      {/each}
                    </select>
                    <button
                      type="submit"
                      class="grid h-8 w-8 place-items-center rounded-full bg-ink-900 text-ink-50 hover:bg-ink-800"
                      title="Simpan routing"
                    >
                      <Icon name="check" size={14} />
                    </button>
                  </form>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Mobile -->
      <ul class="divide-y divide-ink-100 lg:hidden">
        {#each filtered as r (r.id)}
          {@const st = STATE_LABEL[r.state] ?? STATE_LABEL.inactive}
          <li class="p-3">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="truncate font-bold text-ink-900">{r.name}</p>
                <p class="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-500">
                  <span class="rounded-full bg-ink-100 px-1.5 py-0.5 font-bold">{r.kind}</span>
                  <span class="rounded-full px-1.5 py-0.5 font-bold {st.cls}">{st.text}</span>
                  <span class="tabular-nums">{fmt(r.active)}/{fmt(r.total)} layanan</span>
                </p>
              </div>
            </div>
            <form
              method="POST"
              action="?/setRouting"
              use:enhance={() =>
                async ({ result }) => {
                  const j = result as any;
                  const ok = result.type !== "failure";
                  toast(extractActionMsg(j.data) ?? (ok ? "OK" : "Gagal"), ok ? "success" : "error");
                  if (ok) await applyAction(result);
                }}
              class="mt-2 flex items-center gap-1.5"
            >
              <input type="hidden" name="categoryId" value={r.id} />
              <select
                name="providerId"
                class="min-w-0 flex-1 rounded-lg border border-ink-200 bg-surface px-2 py-2 text-xs font-semibold text-ink-700 outline-none focus:border-violet-500"
                aria-label="Provider untuk kategori {r.name}"
              >
                <option value="">Ikut provider aktif</option>
                {#each data.providers as p (p.id)}
                  <option value={p.id} selected={r.routingProviderId === p.id}>
                    {p.name}{p.active ? " (aktif)" : ""}
                  </option>
                {/each}
              </select>
              <button
                type="submit"
                class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink-900 text-ink-50 hover:bg-ink-800"
                title="Simpan routing"
              >
                <Icon name="check" size={14} />
              </button>
            </form>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</section>
