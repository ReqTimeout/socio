<script lang="ts">
  import { Button, ConfirmDialog, EmptyState, toast } from "@socio/ui";
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
    if (q !== data.q) q = data.q;
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

  const levels = ["Demo", "Member", "Agen", "Reseller", "Blacklist", "Admin", "Developers"];
  const levelTone: Record<string, string> = {
    Admin: "bg-primary-50 text-primary-700",
    Developers: "bg-primary-50 text-primary-700",
    Reseller: "bg-accent-50 text-accent-700",
    Agen: "bg-success-soft text-success",
    Member: "bg-ink-100 text-ink-600",
    Demo: "bg-warning-soft text-warning",
    Blacklist: "bg-danger-soft text-danger",
  };
  const fmt = (n: number) => n.toLocaleString("id-ID");

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

<section class="space-y-6">
  <!-- Header: inline narrative (zero card chrome, no stat strip) -->
  <header class="flex flex-wrap items-end justify-between gap-3">
    <div class="min-w-0">
      <h1 class="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">Users</h1>
      <p class="mt-1 text-sm text-ink-500">
        {fmt(data.total)} cocok filter
        <span class="mx-1 text-ink-300">·</span>
        <span class="font-semibold text-ink-700">{fmt(data.stats.total)}</span> total
        <span class="mx-1 text-ink-300">·</span>
        <span class="font-semibold text-success">{fmt(data.stats.active)}</span> aktif
        <span class="mx-1 text-ink-300">·</span>
        <span class="font-semibold text-accent-600">{fmt(data.stats.verified)}</span> verified
        <span class="mx-1 text-ink-300">·</span>
        <span class="font-semibold text-warning">{formatRupiah(data.stats.balance)}</span> total saldo
      </p>
    </div>
    <form method="GET" class="flex flex-wrap items-center gap-2">
      <div class="relative flex-1 min-w-0 sm:max-w-md">
        <input
          type="search"
          name="q"
          bind:value={q}
          oninput={onSearch}
          placeholder="Cari username / email / nama…"
          class="w-full rounded-full border border-ink-200 bg-surface pl-4 pr-4 py-2 text-sm transition-all focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
        />
      </div>
      {#if data.level}<input type="hidden" name="level" value={data.level} />{/if}
      {#if data.status}<input type="hidden" name="status" value={data.status} />{/if}
      {#if data.verified}<input type="hidden" name="verified" value={data.verified} />{/if}
      <Button type="submit" size="md" variant="ghost">Cari</Button>
      {#if hasFilter}
        <a
          href="/admin/users"
          class="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-700"
        >
          Reset filter
        </a>
      {/if}
    </form>
  </header>

  <!-- Filters (advanced) — hairline-top, no card -->
  <details class="group border-t border-ink-200 pt-3">
    <summary
      class="flex cursor-pointer items-center justify-between gap-2 px-1 py-1.5 text-xs font-semibold text-ink-500 transition-colors hover:text-ink-700"
    >
      <span>Filter lanjutan (level / status / verifikasi)</span>
      <span class="transition-transform group-open:rotate-180" aria-hidden="true">▾</span>
    </summary>
    <form method="GET" class="flex flex-wrap items-center gap-2 pt-2">
      {#if data.q}<input type="hidden" name="q" value={data.q} />{/if}
      <select name="level" class="h-9 rounded-xl border border-ink-200 bg-surface px-2 text-sm">
        <option value="" selected={!data.level}>Semua level</option>
        {#each levels as lv}
          <option value={lv} selected={data.level === lv}>{lv}</option>
        {/each}
      </select>
      <select name="status" class="h-9 rounded-xl border border-ink-200 bg-surface px-2 text-sm">
        <option value="" selected={!data.status}>Semua status</option>
        <option value="1" selected={data.status === "1"}>Aktif</option>
        <option value="0" selected={data.status === "0"}>Suspended</option>
      </select>
      <select name="verified" class="h-9 rounded-xl border border-ink-200 bg-surface px-2 text-sm">
        <option value="" selected={!data.verified}>Semua verifikasi</option>
        <option value="1" selected={data.verified === "1"}>Verified</option>
        <option value="0" selected={data.verified === "0"}>Belum</option>
      </select>
      <Button type="submit" size="sm">Terapkan</Button>
    </form>
  </details>

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
    <!-- Desktop table — clean ledger, no card chrome -->
    <div class="hidden overflow-x-auto lg:block">
      <table class="w-full text-sm">
        <thead
          class="sticky top-0 z-10 border-b border-ink-100 bg-ink-50/90 text-left text-xs uppercase tracking-wide text-ink-500 backdrop-blur"
        >
          <tr>
            <th class="p-3"
              ><input
                type="checkbox"
                checked={allOnPage}
                onchange={toggleAll}
                aria-label="Pilih semua di halaman ini"
              /></th
            >
            <th class="p-3 font-semibold">ID</th><th class="p-3 font-semibold">User</th><th
              class="p-3 font-semibold">Name</th
            >
            <th class="p-3 font-semibold">Level</th><th class="p-3 font-semibold text-right"
              >Saldo</th
            ><th class="p-3 font-semibold">Register</th>
            <th class="p-3 font-semibold">Verifikasi</th><th class="p-3 font-semibold">Status</th
            ><th class="p-3 font-semibold text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {#each data.users as u, i (u.id)}
            <tr
              class="reveal border-b border-ink-50 transition-colors hover:bg-ink-50/50 last:border-0"
              style="--d:{240 + i * 30}ms"
            >
              <td class="p-3"
                ><input
                  type="checkbox"
                  checked={selected.has(u.id)}
                  onchange={() => toggleSel(u.id)}
                  aria-label={`Pilih ${u.username}`}
                /></td
              >
              <td class="p-3 font-semibold tabular-nums text-ink-900">#{u.id}</td>
              <td class="p-3"
                ><div class="font-medium text-ink-900">{u.username}</div>
                <div class="text-xs text-ink-400">{u.email}</div></td
              >
              <td class="max-w-[10rem] truncate p-3">{u.fullName}</td>
              <td class="p-3">
                <span
                  class="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold {levelTone[
                    u.level
                  ] ?? 'bg-ink-100 text-ink-600'}">{u.level}</span
                >
              </td>
              <td class="p-3 text-right font-semibold tabular-nums text-ink-900"
                >{formatRupiah(u.balance)}</td
              >
              <td class="whitespace-nowrap p-3 text-xs text-ink-500">{fmtDate(u.createdAt)}</td>
              <td class="p-3">
                {#if u.verify === "Yes"}
                  <span
                    class="inline-flex rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success"
                    >Verified</span
                  >
                {:else}
                  <span
                    class="inline-flex rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-500"
                    >Belum</span
                  >
                {/if}
              </td>
              <td class="p-3">
                <span
                  class="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold {u.status ===
                  '1'
                    ? 'bg-success-soft text-success'
                    : 'bg-danger-soft text-danger'}"
                  >{u.status === "1" ? "Active" : "Suspended"}</span
                >
              </td>
              <td class="p-3 text-right">
                <Button size="sm" variant="ghost" onclick={() => openManage(u)}>Kelola</Button>
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
              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  class="mt-0.5 shrink-0"
                  checked={selected.has(u.id)}
                  onchange={() => toggleSel(u.id)}
                  aria-label={`Pilih ${u.username}`}
                />
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
              <dl class="mt-2 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <dt class="text-ink-400">Saldo</dt>
                  <dd class="tabular-nums font-semibold text-ink-900">{formatRupiah(u.balance)}</dd>
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
                        class="rounded-full bg-success-soft px-2 py-0.5 font-semibold text-success"
                        >Verified</span
                      >
                    {:else}
                      <span class="rounded-full bg-ink-100 px-2 py-0.5 font-semibold text-ink-500"
                        >Belum</span
                      >
                    {/if}
                  </dd>
                </div>
              </dl>
              <div class="mt-1.5 text-[11px] text-ink-400">Daftar {fmtDate(u.createdAt)}</div>
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
            <Button size="sm" variant="ghost" full onclick={() => openManage(u)}>Kelola</Button>
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
    class="fixed inset-x-0 bottom-0 z-40 flex flex-wrap items-center justify-center gap-3 border-t border-ink-100 bg-surface/95 p-3 shadow-lg backdrop-blur lg:bottom-4 lg:left-1/2 lg:right-auto lg:w-auto lg:-translate-x-1/2 lg:rounded-2xl lg:border"
  >
    <span class="text-sm font-semibold">{selected.size} terpilih</span>
    <Button size="sm" onclick={exportCsv}>Export CSV</Button>
    <Button size="sm" variant="ghost" onclick={() => (selected = new Set())}>Batal</Button>
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
      class="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-2xl bg-surface p-5 sm:rounded-2xl"
    >
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <h3 class="font-display text-lg font-bold">Kelola {manage.username}</h3>
          <p class="truncate text-xs text-ink-400">{manage.email} · #{manage.id}</p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-lg px-2 py-1 text-ink-400 hover:bg-ink-100"
          aria-label="Tutup"
          onclick={() => (manage = null)}>✕</button
        >
      </div>

      <!-- Ganti level -->
      <form method="POST" action="?/setLevel" use:enhance={onResult} class="space-y-2">
        <label class="text-xs font-semibold text-ink-500" for="manage-level">Level</label>
        <input type="hidden" name="id" value={manage.id} />
        <div class="flex gap-2">
          <select
            id="manage-level"
            name="level"
            bind:value={manageLevel}
            class="h-10 flex-1 rounded-xl border border-ink-200 bg-surface px-3 text-sm"
          >
            {#each levels as lv}
              <option value={lv}>{lv}</option>
            {/each}
          </select>
          <Button type="submit" size="sm" disabled={manageLevel === manage.level}>Simpan</Button>
        </div>
      </form>

      <hr class="border-ink-100" />

      <!-- Toggle status -->
      <div class="space-y-2">
        <div class="text-xs font-semibold text-ink-500">Status</div>
        <div class="flex items-center justify-between gap-2">
          <span
            class="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold {manage.status === '1'
              ? 'bg-success-soft text-success'
              : 'bg-danger-soft text-danger'}"
            >{manage.status === "1" ? "Active" : "Suspended"}</span
          >
          <Button
            type="button"
            size="sm"
            variant={manage.status === "1" ? "danger" : "primary"}
            onclick={() => (confirmSuspend = true)}
          >
            {manage.status === "1" ? "Suspend" : "Aktifkan"}
          </Button>
        </div>
      </div>

      <hr class="border-ink-100" />

      <!-- Adjust saldo (submit via ConfirmDialog di bawah — G30) -->
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-xs font-semibold text-ink-500">Adjust Saldo</span>
          <span class="text-xs tabular-nums text-ink-500"
            >Saat ini: {formatRupiah(manage.balance)}</span
          >
        </div>
        <input
          name="amount"
          type="number"
          bind:value={amount}
          placeholder="Jumlah (+ menambah / - mengurangi)"
          class="h-10 w-full rounded-xl border border-ink-200 px-3 text-sm"
          required
        />
        <input
          name="reason"
          bind:value={reason}
          placeholder="Alasan (wajib)"
          class="h-10 w-full rounded-xl border border-ink-200 px-3 text-sm"
          required
        />
        <Button
          type="button"
          size="sm"
          full
          onclick={() => {
            if (!amount || !reason.trim()) {
              toast("Isi jumlah dan alasan dulu.", "error");
              return;
            }
            confirmAdjust = true;
          }}>Simpan Adjust</Button
        >
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
