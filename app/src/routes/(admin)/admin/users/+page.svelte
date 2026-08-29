<script lang="ts">
  import { Button, ConfirmDialog, EmptyState, Icon, toast } from "@socio/ui";
  import { enhance } from "$app/forms";
  import { goto } from "$app/navigation";
  import { formatRupiah } from "$lib/format";
  import type { ActionData, PageData } from "./$types";

  type UserRow = PageData["users"][number];

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let q = $state(data.q);

  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  function onSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const u = new URLSearchParams();
      if (q) u.set("q", q);
      if (data.level) u.set("level", data.level);
      if (data.status) u.set("status", data.status);
      if (data.verified) u.set("verified", data.verified);
      goto(`/admin/users?${u.toString()}`, { keepFocus: true, noScroll: true });
    }, 350);
  }
  $effect(() => {
    q = data.q;
  });
  let manage = $state<UserRow | null>(null);
  let manageLevel = $state("");
  let amount = $state(0);
  let reason = $state("");
  let selected = $state<Set<number>>(new Set());
  let confirmSuspend = $state(false); // G30: confirm dialog aksi destruktif
  let confirmAdjust = $state(false);

  function openManage(u: UserRow) {
    manage = u;
    manageLevel = u.level;
    amount = 0;
    reason = "";
    confirmSuspend = false;
    confirmAdjust = false;
  }
  function toggleSel(id: number) {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    selected = s;
  }
  function toggleAll() {
    const s = new Set(selected);
    const all = data.users.every((u) => s.has(u.id));
    for (const u of data.users) {
      if (all) s.delete(u.id);
      else s.add(u.id);
    }
    selected = s;
  }
  const allOnPage = $derived(data.users.length > 0 && data.users.every((u) => selected.has(u.id)));
  const fmtDate = (d: unknown) =>
    new Date(d as string).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  function exportCsv() {
    const rows = data.users.filter((u) => selected.has(u.id));
    if (!rows.length) return;
    const head = [
      "ID",
      "Email",
      "Username",
      "Name",
      "Balance",
      "Register",
      "Status",
      "Verified",
      "Level",
    ];
    const esc = (v: unknown) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
    const body = rows.map((u) =>
      [
        u.id,
        u.email,
        u.username,
        u.fullName,
        u.balance,
        fmtDate(u.createdAt),
        u.status === "1" ? "Active" : "Suspended",
        u.verify === "Yes" ? "Yes" : "No",
        u.level,
      ]
        .map(esc)
        .join(","),
    );
    const csv = "\ufeff" + head.join(",") + "\n" + body.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `users-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  // callback enhance: toast + tutup modal + invalidateAll (data refresh)
  const onResult =
    () =>
    async ({ result, update }: { result: any; update: () => Promise<void> }) => {
      if (result.type === "failure") toast((result.data as any)?.error ?? "Gagal", "error");
      else {
        toast((result.data as any)?.success ?? "OK", "success");
        manage = null;
      }
      await update();
    };

  // A-16: hanya level yang benar-benar ada di DB (Demo/Blacklist/Developers = level mati legacy).
  const levels = ["Member", "Agen", "Reseller", "Admin"];
  const levelTone: Record<string, string> = {
    Admin: "bg-primary-50 text-primary-700",
    Developers: "bg-primary-50 text-primary-700",
    Reseller: "bg-accent-50 text-accent-700",
    Agen: "bg-success-soft text-success",
    Member: "bg-ink-100 text-ink-600",
    Demo: "bg-warning-soft text-warning",
    Blacklist: "bg-danger-soft text-danger",
  };
  const levelAccent: Record<string, string> = {
    Admin: "from-primary-500 to-violet-500",
    Developers: "from-primary-500 to-violet-500",
    Reseller: "from-accent-500 to-pink-500",
    Agen: "from-success to-emerald-500",
    Member: "from-ink-700 to-ink-500",
    Demo: "from-warning to-amber-500",
    Blacklist: "from-danger to-rose-600",
  };
  const fmt = (n: number) => n.toLocaleString("id-ID");
  const initial = (s: string) => (s || "?").trim().charAt(0).toUpperCase();

  // querystring builder yang mempertahankan filter aktif (untuk pagination)
  function pageHref(p: number) {
    const s = new URLSearchParams();
    if (data.q) s.set("q", data.q);
    if (data.level) s.set("level", data.level);
    if (data.status) s.set("status", data.status);
    if (data.verified) s.set("verified", data.verified);
    s.set("p", String(p));
    return `/admin/users?${s.toString()}`;
  }
  const hasFilter = $derived(!!(data.q || data.level || data.status || data.verified));

  // pagination compact: window di sekitar halaman aktif + ellipsis (hindari render ratusan link)
  const pageList = $derived.by<(number | "…")[]>(() => {
    const total = data.pages;
    const cur = data.page;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const want = new Set([1, 2, total - 1, total, cur - 1, cur, cur + 1]);
    const nums = [...want].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
    const out: (number | "…")[] = [];
    let prev = 0;
    for (const n of nums) {
      if (n - prev > 1) out.push("…");
      out.push(n);
      prev = n;
    }
    return out;
  });
</script>

<svelte:head>
  <title>Users — Admin Socio.id</title>
</svelte:head>

<section class="space-y-5 lg:space-y-6">
  <!-- Header: premium hero + balance card -->
  <header class="flex flex-wrap items-end justify-between gap-3">
    <div class="min-w-0">
      <h1
        class="flex items-center gap-2.5 font-display text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl"
      >
        <span
          class="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-[0_8px_22px_-8px_rgba(124,58,237,0.5)]"
        >
          <Icon name="users" size={20} stroke={2.5} />
        </span>
        Users
      </h1>
      <p class="mt-1.5 text-sm text-ink-500">
        {fmt(data.total)} cocok filter
        <span class="mx-1 text-ink-300">·</span>
        <span class="font-semibold text-ink-700">{fmt(data.stats.total)}</span> total
        <span class="mx-1 text-ink-300">·</span>
        <span class="font-semibold text-success">{fmt(data.stats.active)}</span> aktif
        <span class="mx-1 text-ink-300">·</span>
        <span class="font-semibold text-accent-600">{fmt(data.stats.verified)}</span> verified
      </p>
    </div>

    <form method="GET" class="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      <div class="relative w-full min-w-0 flex-1 sm:w-72">
        <span
          class="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-ink-400"
        >
          <Icon name="search" size={15} stroke={2} />
        </span>
        <input
          type="search"
          name="q"
          bind:value={q}
          oninput={onSearch}
          placeholder="Cari username / email / nama…"
          class="h-10 w-full rounded-full border border-ink-200 bg-surface pl-10 pr-4 text-sm shadow-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/15"
        />
      </div>
      {#if data.level}<input type="hidden" name="level" value={data.level} />{/if}
      {#if data.status}<input type="hidden" name="status" value={data.status} />{/if}
      {#if data.verified}<input type="hidden" name="verified" value={data.verified} />{/if}
      {#if hasFilter}
        <a
          href="/admin/users"
          class="inline-flex min-h-[40px] items-center gap-1 rounded-full border border-ink-200 bg-surface px-3 text-xs font-bold text-ink-600 transition-colors hover:border-ink-300 hover:bg-ink-50"
        >
          <Icon name="x" size={12} stroke={2.5} />
          Reset
        </a>
      {/if}
    </form>
  </header>

  <!-- KPI strip (4 cards, premium tone-on-tone) -->
  <div class="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
    <div class="reveal rounded-2xl border border-ink-100 bg-surface p-3.5 sm:p-4" style="--d:60ms">
      <div
        class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-ink-400 sm:text-[11px]"
      >
        <Icon name="users" size={12} stroke={2.25} />
        Total
      </div>
      <div class="mt-1.5 font-display text-xl font-extrabold tabular-nums sm:text-2xl">
        {fmt(data.stats.total)}
      </div>
      <div class="mt-0.5 text-[10px] text-ink-400 sm:text-[11px]">termasuk admin</div>
    </div>
    <div
      class="reveal rounded-2xl border border-success-soft bg-success-soft/40 p-3.5 sm:p-4"
      style="--d:120ms"
    >
      <div
        class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-success sm:text-[11px]"
      >
        <span class="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-success"></span>
        Active
      </div>
      <div class="mt-1.5 font-display text-xl font-extrabold tabular-nums text-success sm:text-2xl">
        {fmt(data.stats.active)}
      </div>
      <div class="mt-0.5 text-[10px] text-ink-500 sm:text-[11px]">
        {data.stats.total > 0 ? Math.round((data.stats.active / data.stats.total) * 100) : 0}% dari
        total
      </div>
    </div>
    <div
      class="reveal rounded-2xl border border-accent-500/20 bg-accent-50/40 p-3.5 sm:p-4"
      style="--d:180ms"
    >
      <div
        class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-accent-700 sm:text-[11px]"
      >
        <Icon name="check" size={12} stroke={2.5} />
        Verified
      </div>
      <div
        class="mt-1.5 font-display text-xl font-extrabold tabular-nums text-accent-700 sm:text-2xl"
      >
        {fmt(data.stats.verified)}
      </div>
      <div class="mt-0.5 text-[10px] text-ink-500 sm:text-[11px]">email terverifikasi</div>
    </div>
    <div
      class="reveal rounded-2xl border border-warning/20 bg-warning-soft/40 p-3.5 sm:p-4"
      style="--d:240ms"
    >
      <div
        class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-warning sm:text-[11px]"
      >
        <Icon name="wallet" size={12} stroke={2.5} />
        Total Saldo
      </div>
      <div
        class="mt-1.5 truncate font-display text-base font-extrabold tabular-nums text-warning sm:text-xl"
      >
        {formatRupiah(data.stats.balance)}
      </div>
      <div class="mt-0.5 text-[10px] text-ink-500 sm:text-[11px]">akumulasi semua user</div>
    </div>
  </div>

  <!-- Quick level filter chips (always visible) -->
  <form
    method="GET"
    class="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]"
    aria-label="Filter level"
  >
    {#if data.q}<input type="hidden" name="q" value={data.q} />{/if}
    {#if data.status}<input type="hidden" name="status" value={data.status} />{/if}
    {#if data.verified}<input type="hidden" name="verified" value={data.verified} />{/if}
    <button
      type="submit"
      name="level"
      value=""
      aria-pressed={!data.level}
      class="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all duration-200 active:scale-95
        {!data.level
        ? 'border-transparent bg-ink-900 text-white shadow-sm'
        : 'border-ink-200 bg-surface text-ink-500 hover:border-ink-300 hover:text-ink-700'}"
    >
      <Icon name="layers" size={12} stroke={2.25} />
      Semua level
    </button>
    {#each levels as lv}
      <button
        type="submit"
        name="level"
        value={lv}
        aria-pressed={data.level === lv}
        class="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all duration-200 active:scale-95
          {data.level === lv
          ? 'border-transparent bg-ink-900 text-white shadow-sm'
          : 'border-ink-200 bg-surface text-ink-500 hover:border-ink-300 hover:text-ink-700'}"
      >
        {lv}
      </button>
    {/each}
  </form>

  <!-- Status + verified chips -->
  <form
    method="GET"
    class="-mx-1 flex flex-wrap items-center gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]"
    aria-label="Filter status & verifikasi"
  >
    {#if data.q}<input type="hidden" name="q" value={data.q} />{/if}
    {#if data.level}<input type="hidden" name="level" value={data.level} />{/if}
    <span class="mr-1 hidden text-[11px] font-semibold text-ink-400 sm:inline">Status:</span>
    <button
      type="submit"
      name="status"
      value=""
      aria-pressed={!data.status}
      class="inline-flex min-h-[34px] shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all active:scale-95
        {!data.status
        ? 'border-transparent bg-ink-900 text-white shadow-sm'
        : 'border-ink-200 bg-surface text-ink-500 hover:border-ink-300'}"
    >
      Semua
    </button>
    <button
      type="submit"
      name="status"
      value="1"
      aria-pressed={data.status === "1"}
      class="inline-flex min-h-[34px] shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all active:scale-95
        {data.status === '1'
        ? 'border-transparent bg-success text-white shadow-sm'
        : 'border-ink-200 bg-surface text-ink-500 hover:border-ink-300'}"
    >
      <span class="h-1.5 w-1.5 rounded-full {data.status === '1' ? 'bg-white' : 'bg-success'}"
      ></span>
      Aktif
    </button>
    <button
      type="submit"
      name="status"
      value="0"
      aria-pressed={data.status === "0"}
      class="inline-flex min-h-[34px] shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all active:scale-95
        {data.status === '0'
        ? 'border-transparent bg-danger text-white shadow-sm'
        : 'border-ink-200 bg-surface text-ink-500 hover:border-ink-300'}"
    >
      <span class="h-1.5 w-1.5 rounded-full {data.status === '0' ? 'bg-white' : 'bg-danger'}"
      ></span>
      Suspended
    </button>
    <span class="mx-1 h-3 w-px bg-ink-200"></span>
    <span class="mr-1 hidden text-[11px] font-semibold text-ink-400 sm:inline">Verifikasi:</span>
    <button
      type="submit"
      name="verified"
      value=""
      aria-pressed={!data.verified}
      class="inline-flex min-h-[34px] shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all active:scale-95
        {!data.verified
        ? 'border-transparent bg-ink-900 text-white shadow-sm'
        : 'border-ink-200 bg-surface text-ink-500 hover:border-ink-300'}"
    >
      Semua
    </button>
    <button
      type="submit"
      name="verified"
      value="1"
      aria-pressed={data.verified === "1"}
      class="inline-flex min-h-[34px] shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all active:scale-95
        {data.verified === '1'
        ? 'border-transparent bg-accent-600 text-white shadow-sm'
        : 'border-ink-200 bg-surface text-ink-500 hover:border-ink-300'}"
    >
      <Icon name="check" size={11} stroke={2.75} />
      Verified
    </button>
    <button
      type="submit"
      name="verified"
      value="0"
      aria-pressed={data.verified === "0"}
      class="inline-flex min-h-[34px] shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all active:scale-95
        {data.verified === '0'
        ? 'border-transparent bg-ink-700 text-white shadow-sm'
        : 'border-ink-200 bg-surface text-ink-500 hover:border-ink-300'}"
    >
      Belum
    </button>
  </form>

  {#if form?.error}
    <div class="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
      {form.error}
    </div>
  {/if}
  {#if form?.success}
    <div class="rounded-xl bg-success/10 px-3 py-2 text-sm font-medium text-success">
      {form.success}
    </div>
  {/if}

  {#if data.users.length === 0}
    <EmptyState
      icon="👥"
      title="Belum ada user"
      description={hasFilter
        ? "Coba ubah filter atau kata kunci."
        : "User akan muncul di sini setelah signup."}
    />
  {:else}
    <!-- Desktop table — 7 kolom kompak (ID+nama di-merge ke kolom User biar muat 1280px) -->
    <div class="hidden overflow-x-auto rounded-2xl border border-ink-100 bg-surface lg:block">
      <table class="w-full text-sm">
        <thead
          class="sticky top-0 z-10 border-b border-ink-100 bg-ink-50/90 text-left text-xs uppercase tracking-wide text-ink-500 backdrop-blur"
        >
          <tr>
            <th class="p-2.5"
              ><label
                class="inline-flex h-11 w-11 cursor-pointer items-center justify-center"
                aria-label="Pilih semua di halaman ini"
                ><input
                  type="checkbox"
                  class="h-4 w-4 cursor-pointer accent-primary"
                  checked={allOnPage}
                  onchange={toggleAll}
                /></label
              ></th
            >
            <th class="p-2.5 font-semibold">User</th>
            <th class="p-2.5 font-semibold">Level</th>
            <th class="p-2.5 font-semibold text-right">Saldo</th>
            <th class="p-2.5 font-semibold">Register</th>
            <th class="p-2.5 font-semibold">Status</th>
            <th class="p-2.5 font-semibold text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {#each data.users as u, i (u.id)}
            <tr
              class="reveal border-b border-ink-50 transition-colors hover:bg-ink-50/50 last:border-0"
              style="--d:{240 + i * 30}ms"
            >
              <td class="p-2.5"
                ><label class="inline-flex h-11 w-11 cursor-pointer items-center justify-center"
                  ><input
                    type="checkbox"
                    class="h-4 w-4 cursor-pointer accent-primary"
                    checked={selected.has(u.id)}
                    onchange={() => toggleSel(u.id)}
                    aria-label={`Pilih ${u.username}`}
                  /></label
                ></td
              >
              <td class="max-w-[16rem] p-2.5"
                ><div class="flex items-center gap-2.5">
                  <span
                    class="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-extrabold text-white shadow-sm bg-gradient-to-br {levelAccent[
                      u.level
                    ] ?? 'from-ink-700 to-ink-500'}"
                  >
                    {initial(u.username)}
                  </span>
                  <div class="min-w-0">
                    <div class="flex items-center gap-1.5 font-medium text-ink-900">
                      <span class="truncate">{u.username}</span>
                      <span class="shrink-0 text-xs tabular-nums text-ink-400">#{u.id}</span>
                    </div>
                    <div class="truncate text-xs text-ink-400">{u.email}</div>
                    {#if u.fullName}<div class="truncate text-xs text-ink-300">
                        {u.fullName}
                      </div>{/if}
                  </div>
                </div></td
              >
              <td class="p-2.5">
                <div class="flex flex-col items-start gap-1">
                  <span
                    class="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold {levelTone[
                      u.level
                    ] ?? 'bg-ink-100 text-ink-600'}">{u.level}</span
                  >
                  {#if u.verify === "Yes"}
                    <span
                      class="inline-flex items-center gap-1 text-[11px] font-semibold text-success"
                      >✓ Verified</span
                    >
                  {:else}
                    <span class="text-[11px] font-medium text-ink-400">Belum verifikasi</span>
                  {/if}
                </div>
              </td>
              <td class="p-2.5 text-right font-semibold tabular-nums text-ink-900"
                >{formatRupiah(u.balance)}</td
              >
              <td class="whitespace-nowrap p-2.5 text-xs text-ink-500">{fmtDate(u.createdAt)}</td>
              <td class="p-2.5">
                <span
                  class="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold {u.status ===
                  '1'
                    ? 'bg-success-soft text-success'
                    : 'bg-danger-soft text-danger'}"
                  >{u.status === "1" ? "Active" : "Suspended"}</span
                >
              </td>
              <td class="p-2.5 text-right">
                <button
                  type="button"
                  onclick={() => openManage(u)}
                  class="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink-900 px-3 text-xs font-bold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-ink-800 hover:shadow-md active:scale-95"
                >
                  <Icon name="sliders" size={12} stroke={2.5} />
                  Kelola
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Mobile ledger (hairline rows, no card chrome, data real lengkap) -->
    <ul class="lg:hidden">
      {#each data.users as u, i (u.id)}
        <li
          class="reveal border-b border-ink-100 py-3 last:border-b-0 transition-colors hover:bg-ink-50/40"
          style="--d:{240 + i * 30}ms"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2.5">
                <label
                  class="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center"
                  ><input
                    type="checkbox"
                    class="h-4 w-4 cursor-pointer accent-primary"
                    checked={selected.has(u.id)}
                    onchange={() => toggleSel(u.id)}
                    aria-label={`Pilih ${u.username}`}
                  /></label
                >
                <span
                  class="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-extrabold text-white shadow-sm bg-gradient-to-br {levelAccent[
                    u.level
                  ] ?? 'from-ink-700 to-ink-500'}"
                >
                  {initial(u.username)}
                </span>
                <div class="min-w-0">
                  <div class="flex items-center gap-1.5">
                    <span class="truncate font-semibold text-ink-900">{u.username}</span>
                    <span class="shrink-0 tabular-nums text-xs text-ink-400">#{u.id}</span>
                  </div>
                  <p class="truncate text-xs text-ink-500">{u.email}</p>
                  {#if u.fullName}<p class="truncate text-xs text-ink-400">{u.fullName}</p>{/if}
                </div>
              </div>
              <!-- Saldo + status + level ladder -->
              <dl class="mt-2.5 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <dt class="text-ink-400">Saldo</dt>
                  <dd class="tabular-nums font-bold text-ink-900">{formatRupiah(u.balance)}</dd>
                </div>
                <div>
                  <dt class="text-ink-400">Level</dt>
                  <dd>
                    <span
                      class="rounded-full px-2 py-0.5 font-semibold {levelTone[u.level] ??
                        'bg-ink-100 text-ink-600'}">{u.level}</span
                    >
                  </dd>
                </div>
                <div>
                  <dt class="text-ink-400">Verifikasi</dt>
                  <dd>
                    {#if u.verify === "Yes"}
                      <span
                        class="inline-flex items-center gap-0.5 rounded-full bg-success-soft px-2 py-0.5 font-semibold text-success"
                      >
                        <Icon name="check" size={10} stroke={3} />
                        Verified
                      </span>
                    {:else}
                      <span class="rounded-full bg-ink-100 px-2 py-0.5 font-semibold text-ink-500"
                        >Belum</span
                      >
                    {/if}
                  </dd>
                </div>
              </dl>
              <div class="mt-1.5 flex items-center gap-1 text-[11px] text-ink-400">
                <Icon name="calendar" size={11} stroke={2} />
                Daftar {fmtDate(u.createdAt)}
              </div>
            </div>
            <div class="flex shrink-0 flex-col items-end gap-1.5">
              {#if u.status === "1"}
                <span
                  class="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-bold text-success"
                >
                  <span class="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-success"
                  ></span>Active
                </span>
              {:else}
                <span
                  class="rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-bold text-danger"
                  >Suspended</span
                >
              {/if}
            </div>
          </div>
          <div class="mt-3 flex gap-2">
            <button
              type="button"
              onclick={() => openManage(u)}
              class="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-ink-900 text-xs font-bold text-white shadow-sm transition-all active:scale-95 hover:bg-ink-800"
            >
              <Icon name="sliders" size={12} stroke={2.5} />
              Kelola
            </button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}

  <!-- Pagination -->
  {#if data.pages > 1}
    <nav class="flex flex-wrap items-center justify-center gap-1 pt-2" aria-label="Pagination">
      <a
        href={pageHref(Math.max(1, data.page - 1))}
        class="inline-flex h-9 items-center justify-center rounded-full border border-ink-200 bg-surface px-3 text-xs font-semibold text-ink-600 transition-colors hover:border-ink-300 hover:bg-ink-50 {data.page ===
        1
          ? 'pointer-events-none opacity-50'
          : ''}"
        aria-label="Previous page">← Prev</a
      >
      {#each pageList as p}
        {#if p === "…"}
          <span class="px-1 text-ink-400">…</span>
        {:else}
          <a
            href={pageHref(p)}
            class="inline-flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-xs font-semibold tabular-nums transition-colors
              {p === data.page
              ? 'bg-ink-900 text-white shadow-sm'
              : 'border border-ink-200 bg-surface text-ink-600 hover:border-ink-300 hover:bg-ink-50'}"
            aria-current={p === data.page ? "page" : undefined}>{p}</a
          >
        {/if}
      {/each}
      <a
        href={pageHref(Math.min(data.pages, data.page + 1))}
        class="inline-flex h-9 items-center justify-center rounded-full border border-ink-200 bg-surface px-3 text-xs font-semibold text-ink-600 transition-colors hover:border-ink-300 hover:bg-ink-50 {data.page ===
        data.pages
          ? 'pointer-events-none opacity-50'
          : ''}"
        aria-label="Next page">Next →</a
      >
    </nav>
  {/if}
</section>

<!-- Bulk action bar -->
{#if selected.size > 0}
  <div
    class="fixed inset-x-0 bottom-0 z-40 flex flex-wrap items-center justify-center gap-2 border-t border-ink-100 bg-surface/95 p-3 shadow-2xl backdrop-blur lg:bottom-4 lg:left-1/2 lg:right-auto lg:w-auto lg:-translate-x-1/2 lg:rounded-2xl lg:border lg:px-4 lg:py-2.5"
  >
    <span
      class="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-2.5 py-1 text-xs font-bold text-white"
    >
      <span class="h-1.5 w-1.5 rounded-full bg-accent-500"></span>
      {selected.size} user dipilih
    </span>
    <button
      type="button"
      onclick={exportCsv}
      class="inline-flex h-9 items-center gap-1.5 rounded-full bg-success px-3 text-xs font-bold text-white shadow-sm transition-all active:scale-95 hover:bg-success/90"
    >
      <Icon name="download" size={12} stroke={2.75} />
      Export CSV
    </button>
    <button
      type="button"
      onclick={() => (selected = new Set())}
      class="inline-flex h-9 items-center gap-1 rounded-full border border-ink-200 bg-surface px-3 text-xs font-bold text-ink-600 transition-colors hover:bg-ink-50"
    >
      Batal
    </button>
  </div>
{/if}

<!-- Kelola modal (level + status + adjust saldo) -->
{#if manage}
  <div
    class="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
    role="presentation"
    onclick={(e) => {
      if (e.target === e.currentTarget) manage = null;
    }}
  >
    <div
      class="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-2xl bg-surface p-5 shadow-2xl sm:rounded-2xl"
    >
      <!-- Modal header: avatar + identity -->
      <div class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 items-center gap-3">
          <span
            class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-base font-extrabold text-white shadow-md bg-gradient-to-br {levelAccent[
              manage.level
            ] ?? 'from-ink-700 to-ink-500'}"
          >
            {initial(manage.username)}
          </span>
          <div class="min-w-0">
            <h3 class="truncate font-display text-lg font-extrabold">Kelola {manage.username}</h3>
            <p class="truncate text-xs text-ink-400">{manage.email} · #{manage.id}</p>
          </div>
        </div>
        <button
          type="button"
          class="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-700"
          aria-label="Tutup"
          onclick={() => (manage = null)}
        >
          <Icon name="x" size={16} stroke={2.5} />
        </button>
      </div>

      <!-- Ganti level -->
      <div class="space-y-2">
        <div class="flex items-center gap-1.5 text-xs font-bold text-ink-500">
          <Icon name="crown" size={12} stroke={2.5} class="text-accent-600" />
          Ubah Level
        </div>
        <form method="POST" action="?/setLevel" use:enhance={onResult} class="flex gap-2">
          <input type="hidden" name="id" value={manage.id} />
          <select
            id="manage-level"
            name="level"
            bind:value={manageLevel}
            class="h-10 flex-1 rounded-xl border border-ink-200 bg-surface px-3 text-sm font-semibold focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/15"
          >
            {#each levels as lv}
              <option value={lv}>{lv}</option>
            {/each}
          </select>
          <button
            type="submit"
            disabled={manageLevel === manage.level}
            class="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-primary-600 px-4 text-sm font-bold text-white shadow-sm transition-all hover:bg-primary-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon name="check" size={13} stroke={2.75} />
            Simpan
          </button>
        </form>
      </div>

      <hr class="border-ink-100" />

      <!-- Toggle status -->
      <div class="space-y-2">
        <div class="flex items-center gap-1.5 text-xs font-bold text-ink-500">
          <Icon name="shield" size={12} stroke={2.5} class="text-ink-600" />
          Status Akun
        </div>
        <div
          class="flex items-center justify-between gap-2 rounded-xl border border-ink-100 bg-ink-50/50 p-3"
        >
          <span
            class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold {manage.status ===
            '1'
              ? 'bg-success-soft text-success'
              : 'bg-danger-soft text-danger'}"
          >
            {#if manage.status === "1"}
              <span class="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-success"></span>
              Active
            {:else}
              <Icon name="lock" size={10} stroke={2.75} />
              Suspended
            {/if}
          </span>
          <button
            type="button"
            onclick={() => (confirmSuspend = true)}
            class="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-bold shadow-sm transition-all active:scale-95 {manage.status ===
            '1'
              ? 'bg-danger text-white hover:bg-danger/90'
              : 'bg-success text-white hover:bg-success/90'}"
          >
            <Icon name={manage.status === "1" ? "lock" : "check"} size={12} stroke={2.75} />
            {manage.status === "1" ? "Suspend" : "Aktifkan"}
          </button>
        </div>
      </div>

      <hr class="border-ink-100" />

      <!-- Adjust saldo (submit via ConfirmDialog di bawah — G30) -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1.5 text-xs font-bold text-ink-500">
            <Icon name="wallet" size={12} stroke={2.5} class="text-warning" />
            Adjust Saldo
          </div>
          <span
            class="rounded-full bg-warning-soft px-2.5 py-0.5 text-[11px] font-bold text-warning tabular-nums"
            >Saat ini {formatRupiah(manage.balance)}</span
          >
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            onclick={() => (amount = Math.abs(amount || 0))}
            class="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-ink-200 bg-success-soft text-success transition-colors hover:bg-success hover:text-white"
            aria-label="Set tambah"
            title="Set ke nilai positif"
          >
            <Icon name="plus" size={16} stroke={2.75} />
          </button>
          <input
            name="amount"
            type="number"
            bind:value={amount}
            placeholder="Jumlah (+ tambah / - kurang)"
            class="h-10 w-full rounded-xl border border-ink-200 px-3 text-sm tabular-nums focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/15"
            required
          />
          <button
            type="button"
            onclick={() => (amount = -Math.abs(amount || 0))}
            class="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-ink-200 bg-danger-soft text-danger transition-colors hover:bg-danger hover:text-white"
            aria-label="Set kurang"
            title="Set ke nilai negatif"
          >
            <Icon name="arrow_down" size={16} stroke={2.75} />
          </button>
        </div>
        <input
          name="reason"
          bind:value={reason}
          placeholder="Alasan (wajib, tercatat di audit log)"
          class="h-10 w-full rounded-xl border border-ink-200 px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/15"
          required
        />
        <button
          type="button"
          onclick={() => {
            if (!amount || !reason.trim()) {
              toast("Isi jumlah dan alasan dulu.", "error");
              return;
            }
            confirmAdjust = true;
          }}
          class="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-ink-900 text-sm font-bold text-white shadow-sm transition-all hover:bg-ink-800 active:scale-95"
        >
          <Icon name="check" size={13} stroke={2.75} />
          Simpan Adjust
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- G30: confirm dialog suspend (destruktif) -->
{#if manage}
  <ConfirmDialog
    bind:open={confirmSuspend}
    danger={manage.status === "1"}
    title={manage.status === "1" ? "Suspend User" : "Aktifkan User"}
    message={manage.status === "1"
      ? `${manage.username} tidak akan bisa login & order. Lanjutkan?`
      : `${manage.username} akan diaktifkan kembali.`}
  >
    <form
      method="POST"
      action="?/suspend"
      use:enhance={() => async (input: any) => {
        const { result, update } = input;
        confirmSuspend = false;
        if (result.type === "failure") toast((result.data as any)?.error ?? "Gagal", "error");
        else toast((result.data as any)?.success ?? "OK", "success");
        await update();
      }}
      class="flex gap-3"
    >
      <input type="hidden" name="id" value={manage.id} />
      <Button type="button" variant="ghost" full onclick={() => (confirmSuspend = false)}
        >Batal</Button
      >
      <Button type="submit" variant={manage.status === "1" ? "danger" : "primary"} full>
        {manage.status === "1" ? "Ya, Suspend" : "Ya, Aktifkan"}
      </Button>
    </form>
  </ConfirmDialog>

  <!-- G30: confirm dialog adjust saldo (destruktif, aksi uang) -->
  <ConfirmDialog
    bind:open={confirmAdjust}
    danger={amount < 0}
    title="Konfirmasi Adjust Saldo"
    message="Saldo {manage.username} akan diubah {amount >= 0 ? '+' : ''}{formatRupiah(
      Math.abs(amount),
    )}. Aksi ini tercatat di audit log."
  >
    <form
      method="POST"
      action="?/adjust"
      use:enhance={() => async (input: any) => {
        const { result, update } = input;
        confirmAdjust = false;
        if (result.type === "failure") toast((result.data as any)?.error ?? "Gagal", "error");
        else {
          toast((result.data as any)?.success ?? "OK", "success");
          manage = null;
        }
        await update();
      }}
      class="flex gap-3"
    >
      <input type="hidden" name="id" value={manage.id} />
      <input type="hidden" name="amount" value={amount} />
      <input type="hidden" name="reason" value={reason} />
      <Button type="button" variant="ghost" full onclick={() => (confirmAdjust = false)}
        >Batal</Button
      >
      <Button type="submit" variant={amount < 0 ? "danger" : "primary"} full>Ya, Simpan</Button>
    </form>
  </ConfirmDialog>
{/if}

<style>
  /* Stagger reveal untuk stat cards + table rows + mobile cards */
  .reveal {
    animation: reveal 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
    animation-delay: var(--d, 0ms);
  }
  @keyframes reveal {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .reveal {
      animation: none;
    }
    .pulse-dot {
      animation: none;
    }
  }
  /* Domain-specific: status pulse untuk user aktif */
  .pulse-dot {
    animation: pulse-soft 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  @keyframes pulse-soft {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.55;
      transform: scale(0.85);
    }
  }
</style>
