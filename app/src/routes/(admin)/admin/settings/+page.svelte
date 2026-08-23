<script lang="ts">
  import { Button, Icon, toast } from "@socio/ui";
  import { applyAction, enhance } from "$app/forms";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();

  // State inline edit untuk pricing
  let editPricingId = $state<number | null>(null);
  let editMarkup = $state(0);
  let editFlat = $state(0);
  let editMinProfit = $state(0);

  function startEditPricing(p: {
    id: number;
    markupPercent: number;
    flatPer1k: number;
    minProfitPer1k: number;
  }) {
    editPricingId = p.id;
    editMarkup = p.markupPercent;
    editFlat = p.flatPer1k;
    editMinProfit = p.minProfitPer1k;
  }

  function cancelEditPricing() {
    editPricingId = null;
  }

  // Enhance untuk tombol aksi pricing (seed/apply/bulk) — toast hasil
  const submitEnhance =
    () =>
    async ({ result }: any) => {
      const r = result as any;
      if (result.type === "failure") toast(r.data?.error ?? "Gagal", "error");
      else if (result.type === "success") toast(r.data?.success ?? "OK", "success");
      await applyAction(result);
    };

  function fmt(n: number) {
    return n.toLocaleString("id-ID");
  }

  // --- Kalkulator harga live (Task #1) ---
  type Rule = { level: string; markupPercent: number; flatPer1k: number; minProfitPer1k: number };
  function ruleFor(level: string): Rule | undefined {
    return data.pricing.find((p) => p.level === level) as Rule | undefined;
  }
  function pricePer1k(base: number, r: Rule) {
    return base * (1 + r.markupPercent / 100) + r.flatPer1k;
  }
  function sellPrice(base: number, qty: number, r: Rule) {
    const units = Math.max(1, Math.floor(qty / 1000));
    return pricePer1k(base, r) * units + r.minProfitPer1k * units;
  }

  let calcQty = $state(1000);
  let calcLevel = $state("Member");
  const calcBase = $derived(data.sampleService?.basePrice ?? 1000);
  const calcRule = $derived(ruleFor(calcLevel));
  const calcSell = $derived(calcRule ? sellPrice(calcBase, calcQty, calcRule) : 0);
  const calcModal = $derived(calcBase * Math.max(1, Math.floor(calcQty / 1000)));
  const calcProfit = $derived(calcSell - calcModal);

  // Live preview saat edit markup (pakai sample service, qty 1000)
  const previewSell = $derived(
    calcRule ? sellPrice(calcBase, 1000, { ...calcRule, markupPercent: editMarkup }) : 0,
  );

  // System status indicators
  const checks = $derived([
    { label: "Database", ok: data.system.hasDbUrl },
    { label: "SMMturk key", ok: data.system.hasSmmturk },
    { label: "Resend", ok: data.system.hasResend },
    { label: "Job queue", ok: true, detail: `${data.system.queuePending} pending` },
    { label: "ENV", ok: data.system.nodeEnv === "production", detail: data.system.nodeEnv },
  ]);

  const ROLE_TONE: Record<string, string> = {
    superadmin: "bg-primary-50 text-primary-700",
    admin: "bg-accent-soft text-accent-ink",
    operator: "bg-warning-soft text-warning",
    viewer: "bg-ink-100 text-ink-500",
  };
</script>

<svelte:head>
  <title>Settings — Admin Socio.id</title>
</svelte:head>

<section class="space-y-4">
  <header>
    <h1 class="font-display text-xl font-bold">Settings</h1>
    <p class="text-sm text-ink-500">Konfigurasi sistem, pricing, role, dan toggle operasional.</p>
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

  <!-- ===== Operational Toggles ===== -->
  <div class="grid gap-3 lg:grid-cols-2">
    <!-- Maintenance -->
    <div class="flex items-center justify-between rounded-2xl border border-ink-100 bg-surface p-4">
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <span
            class="grid h-8 w-8 place-items-center rounded-lg {data.maintenance
              ? 'bg-danger/10 text-danger'
              : 'bg-success-soft text-success'}"
          >
            <Icon name={data.maintenance ? "alert" : "check"} size={14} stroke={2.5} />
          </span>
          <h3 class="text-sm font-semibold">Maintenance Mode</h3>
        </div>
        <p class="mt-1 text-xs text-ink-500">
          Blokir user order saat deploy/fix. Admin tetap bisa akses.
        </p>
      </div>
      <form
        method="POST"
        action="?/maintenance"
        use:enhance={() =>
          async ({ result }) => {
            const r = result as any;
            if (result.type === "failure") toast(r.data?.error ?? "Gagal", "error");
            else toast(r.data?.success ?? "OK", "success");
            await applyAction(result);
          }}
      >
        <input type="hidden" name="on" value={data.maintenance ? "0" : "1"} />
        <Button type="submit" variant={data.maintenance ? "ghost" : "danger"}>
          {data.maintenance ? "Nonaktifkan" : "Aktifkan"}
        </Button>
      </form>
    </div>

    <!-- 2FA -->
    <div class="flex items-center justify-between rounded-2xl border border-ink-100 bg-surface p-4">
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <span
            class="grid h-8 w-8 place-items-center rounded-lg {data.api2fa
              ? 'bg-success-soft text-success'
              : 'bg-ink-100 text-ink-500'}"
          >
            <Icon name="shield" size={14} stroke={2.5} />
          </span>
          <h3 class="text-sm font-semibold">2FA Admin (TOTP)</h3>
        </div>
        <p class="mt-1 text-xs text-ink-500">
          Wajibkan kode TOTP saat login admin. (M3.5 — saat ini informational.)
        </p>
      </div>
      <form
        method="POST"
        action="?/toggle2fa"
        use:enhance={() =>
          async ({ result }) => {
            const r = result as any;
            if (result.type === "failure") toast(r.data?.error ?? "Gagal", "error");
            else toast(r.data?.success ?? "OK", "success");
            await applyAction(result);
          }}
      >
        <input type="hidden" name="on" value={data.api2fa ? "0" : "1"} />
        <Button type="submit" variant={data.api2fa ? "ghost" : "primary"}>
          {data.api2fa ? "Nonaktifkan" : "Aktifkan"}
        </Button>
      </form>
    </div>

    <!-- Public API -->
    <div class="flex items-center justify-between rounded-2xl border border-ink-100 bg-surface p-4">
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <span
            class="grid h-8 w-8 place-items-center rounded-lg {data.apiPublic
              ? 'bg-primary-50 text-primary-600'
              : 'bg-ink-100 text-ink-500'}"
          >
            <Icon name="link" size={14} stroke={2.5} />
          </span>
          <h3 class="text-sm font-semibold">API Publik</h3>
        </div>
        <p class="mt-1 text-xs text-ink-500">
          Endpoint <code>/api/v1/*</code> untuk user (order via API).
        </p>
      </div>
      <form
        method="POST"
        action="?/togglePublicApi"
        use:enhance={() =>
          async ({ result }) => {
            const r = result as any;
            if (result.type === "failure") toast(r.data?.error ?? "Gagal", "error");
            else toast(r.data?.success ?? "OK", "success");
            await applyAction(result);
          }}
      >
        <input type="hidden" name="on" value={data.apiPublic ? "0" : "1"} />
        <Button type="submit" variant={data.apiPublic ? "ghost" : "primary"}>
          {data.apiPublic ? "Nonaktifkan" : "Aktifkan"}
        </Button>
      </form>
    </div>

    <!-- Signup verify -->
    <div class="flex items-center justify-between rounded-2xl border border-ink-100 bg-surface p-4">
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2">
          <span
            class="grid h-8 w-8 place-items-center rounded-lg {data.signupVerify
              ? 'bg-success-soft text-success'
              : 'bg-ink-100 text-ink-500'}"
          >
            <Icon name="mail" size={14} stroke={2.5} />
          </span>
          <h3 class="text-sm font-semibold">Verifikasi Email Signup</h3>
        </div>
        <p class="mt-1 text-xs text-ink-500">Wajibkan konfirmasi email sebelum akun aktif.</p>
      </div>
      <form
        method="POST"
        action="?/toggleSignupVerify"
        use:enhance={() =>
          async ({ result }) => {
            const r = result as any;
            if (result.type === "failure") toast(r.data?.error ?? "Gagal", "error");
            else toast(r.data?.success ?? "OK", "success");
            await applyAction(result);
          }}
      >
        <input type="hidden" name="on" value={data.signupVerify ? "0" : "1"} />
        <Button type="submit" variant={data.signupVerify ? "ghost" : "primary"}>
          {data.signupVerify ? "Nonaktifkan" : "Aktifkan"}
        </Button>
      </form>
    </div>
  </div>

  <!-- ===== Pricing Rules ===== -->
  <div class="rounded-2xl border border-ink-100 bg-surface">
    <div class="border-b border-ink-100 px-4 py-3">
      <h2 class="text-sm font-bold">Pricing rules per level</h2>
      <p class="mt-0.5 text-xs text-ink-400">
        Markup = berapa % di atas base price. Default baru: Member +200%, Agen +150%, Reseller
        +180%, Admin 0%.
      </p>
    </div>

    <!-- Kalkulator harga live -->
    <div class="grid gap-3 border-b border-ink-100 p-4 sm:grid-cols-2">
      <div class="rounded-xl bg-ink-50 p-3">
        <p class="text-[10px] font-bold uppercase tracking-wide text-ink-400">Kalkulator harga</p>
        {#if data.sampleService}
          <p class="mt-1 text-xs text-ink-500">
            Contoh: <strong>{data.sampleService.name}</strong> (base {fmt(
              data.sampleService.basePrice,
            )}/1k)
          </p>
        {:else}
          <p class="mt-1 text-xs text-ink-500">Base contoh: {fmt(calcBase)}/1k</p>
        {/if}
        <div class="mt-2 flex flex-wrap gap-2">
          <label class="block">
            <span class="mb-1 block text-[10px] font-bold text-ink-500">Level</span>
            <select
              bind:value={calcLevel}
              class="rounded-lg border border-ink-200 px-2 py-1 text-sm"
            >
              {#each data.pricing as p (p.id)}<option value={p.level}>{p.level}</option>{/each}
            </select>
          </label>
          <label class="block">
            <span class="mb-1 block text-[10px] font-bold text-ink-500">Quantity</span>
            <input
              type="number"
              min="1"
              step="100"
              bind:value={calcQty}
              class="w-28 rounded-lg border border-ink-200 px-2 py-1 text-sm"
            />
          </label>
        </div>
        <dl class="mt-3 space-y-1 text-xs">
          <div class="flex justify-between">
            <dt class="text-ink-500">Modal (base)</dt>
            <dd class="tabular-nums font-semibold">Rp {fmt(Math.round(calcModal))}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-ink-500">Jual ke user</dt>
            <dd class="tabular-nums font-bold text-primary">Rp {fmt(Math.round(calcSell))}</dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-ink-500">Profit</dt>
            <dd class="tabular-nums font-semibold text-success">
              Rp {fmt(Math.round(calcProfit))}
            </dd>
          </div>
        </dl>
      </div>
      <div class="flex flex-col gap-2">
        <form method="POST" action="?/applyDefaults" use:enhance={submitEnhance}>
          <Button type="submit" variant="primary" class="w-full">Terapkan default baru</Button>
        </form>
        <form method="POST" action="?/bulkApply" use:enhance={submitEnhance}>
          <input type="hidden" name="markup" value={editMarkup || 0} />
          <Button type="submit" variant="ghost" class="w-full">Copy markup Member ke semua</Button>
        </form>
        {#if data.pricing.length === 0}
          <form method="POST" action="?/seed" use:enhance={submitEnhance}>
            <Button type="submit" variant="ghost" class="w-full">Generate default (seed)</Button>
          </form>
        {/if}
      </div>
    </div>

    {#if data.pricing.length === 0}
      <p class="p-6 text-center text-sm text-ink-400">
        Belum ada pricing rule. Jalankan seeder untuk generate default.
      </p>
    {:else}
      <!-- Mobile cards -->
      <ul class="divide-y divide-ink-50 lg:hidden">
        {#each data.pricing as p (p.id)}
          <li class="p-4">
            {#if editPricingId === p.id}
              <form
                method="POST"
                action="?/updatePricing"
                use:enhance={() =>
                  async ({ result }) => {
                    const r = result as any;
                    if (result.type === "failure") toast(r.data?.error ?? "Gagal", "error");
                    else {
                      toast(r.data?.success ?? "OK", "success");
                      editPricingId = null;
                    }
                    await applyAction(result);
                  }}
                class="space-y-2"
              >
                <input type="hidden" name="id" value={p.id} />
                <div class="flex items-center justify-between">
                  <span class="text-sm font-bold">{p.level}</span>
                  <span
                    class="rounded-full px-2 py-0.5 text-[10px] font-bold {p.isActive
                      ? 'bg-success-soft text-success'
                      : 'bg-ink-100 text-ink-500'}"
                  >
                    {p.isActive ? "Aktif" : "Off"}
                  </span>
                </div>
                <label class="block">
                  <span class="mb-1 block text-[10px] font-bold text-ink-500">Markup (%)</span>
                  <input
                    type="number"
                    name="markupPercent"
                    step="0.1"
                    min="0"
                    max="1000"
                    bind:value={editMarkup}
                    class="w-full rounded-lg border border-ink-200 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </label>
                {#if data.sampleService}
                  <p class="rounded-lg bg-ink-50 px-2 py-1 text-[10px] text-ink-500">
                    Preview ({data.sampleService.name}, 1000):
                    <strong class="text-primary">Rp {fmt(Math.round(previewSell))}</strong>
                  </p>
                {/if}
                <label class="block">
                  <span
                    class="mb-1 block text-[10px] font-bold text-ink-500"
                    title="Tambahan harga tetap per 1000 quantity, di luar markup %."
                    >Flat per 1k (IDR) <span class="text-ink-300">ⓘ</span></span
                  >
                  <input
                    type="number"
                    name="flatPer1k"
                    step="1"
                    bind:value={editFlat}
                    class="w-full rounded-lg border border-ink-200 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </label>
                <label class="block">
                  <span
                    class="mb-1 block text-[10px] font-bold text-ink-500"
                    title="Profit minimal per 1000 quantity yang dijamin."
                    >Min profit per 1k <span class="text-ink-300">ⓘ</span></span
                  >
                  <input
                    type="number"
                    name="minProfitPer1k"
                    step="1"
                    bind:value={editMinProfit}
                    class="w-full rounded-lg border border-ink-200 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </label>
                <div class="flex gap-2">
                  <button
                    type="button"
                    onclick={cancelEditPricing}
                    class="flex-1 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-50"
                  >
                    Batal
                  </button>
                  <Button type="submit" class="flex-1">Simpan</Button>
                </div>
              </form>
            {:else}
              <div class="flex items-start justify-between gap-2">
                <div>
                  <p class="font-bold">{p.level}</p>
                  <p class="mt-1 text-xs text-ink-500">
                    Markup <strong class="text-ink-700">{p.markupPercent}%</strong> · Flat {fmt(
                      p.flatPer1k,
                    )} · Min profit {fmt(p.minProfitPer1k)}
                  </p>
                </div>
                <button
                  type="button"
                  onclick={() => startEditPricing(p)}
                  class="grid h-8 w-8 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-700"
                  aria-label="Edit pricing"
                >
                  <Icon name="settings" size={14} />
                </button>
              </div>
            {/if}
          </li>
        {/each}
      </ul>

      <!-- Desktop table -->
      <table class="hidden w-full text-sm lg:table">
        <thead>
          <tr
            class="border-b border-ink-100 text-left text-[10px] font-bold uppercase tracking-wide text-ink-400"
          >
            <th class="px-4 py-2">Level</th>
            <th class="px-2 py-2">Markup (%)</th>
            <th class="px-2 py-2">Flat / 1k</th>
            <th class="px-2 py-2">Min profit / 1k</th>
            <th class="px-2 py-2 text-center">Status</th>
            <th class="px-4 py-2 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {#each data.pricing as p (p.id)}
            <tr class="border-b border-ink-50 last:border-b-0">
              <td class="px-4 py-3 font-bold">{p.level}</td>
              <td class="px-2 py-3">
                {#if editPricingId === p.id}
                  <input
                    type="number"
                    name="markupPercent"
                    step="0.1"
                    min="0"
                    max="1000"
                    bind:value={editMarkup}
                    class="w-24 rounded-lg border border-ink-200 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                {:else}
                  <span class="tabular-nums">{p.markupPercent}%</span>
                {/if}
              </td>
              <td class="px-2 py-3">
                {#if editPricingId === p.id}
                  <input
                    type="number"
                    name="flatPer1k"
                    step="1"
                    bind:value={editFlat}
                    class="w-24 rounded-lg border border-ink-200 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                {:else}
                  <span class="tabular-nums">{fmt(p.flatPer1k)}</span>
                {/if}
              </td>
              <td class="px-2 py-3">
                {#if editPricingId === p.id}
                  <input
                    type="number"
                    name="minProfitPer1k"
                    step="1"
                    bind:value={editMinProfit}
                    class="w-24 rounded-lg border border-ink-200 px-2 py-1 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                {:else}
                  <span class="tabular-nums">{fmt(p.minProfitPer1k)}</span>
                {/if}
              </td>
              <td class="px-2 py-3 text-center">
                <span
                  class="rounded-full px-2 py-0.5 text-[10px] font-bold {p.isActive
                    ? 'bg-success-soft text-success'
                    : 'bg-ink-100 text-ink-500'}"
                >
                  {p.isActive ? "Aktif" : "Off"}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                {#if editPricingId === p.id}
                  <form
                    method="POST"
                    action="?/updatePricing"
                    use:enhance={() =>
                      async ({ result }) => {
                        const r = result as any;
                        if (result.type === "failure") toast(r.data?.error ?? "Gagal", "error");
                        else {
                          toast(r.data?.success ?? "OK", "success");
                          editPricingId = null;
                        }
                        await applyAction(result);
                      }}
                    class="inline-flex gap-1"
                  >
                    <input type="hidden" name="id" value={p.id} />
                    <button
                      type="button"
                      onclick={cancelEditPricing}
                      class="rounded-lg px-2 py-1 text-xs font-semibold text-ink-500 hover:bg-ink-100"
                    >
                      Batal
                    </button>
                    <Button type="submit" size="sm">Simpan</Button>
                  </form>
                {:else}
                  <button
                    type="button"
                    onclick={() => startEditPricing(p)}
                    class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-ink-500 hover:bg-ink-100 hover:text-ink-700"
                  >
                    <Icon name="settings" size={12} />Edit
                  </button>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>

  <!-- ===== Admin Roles (RBAC) ===== -->
  <div class="rounded-2xl border border-ink-100 bg-surface">
    <div class="border-b border-ink-100 px-4 py-3">
      <h2 class="text-sm font-bold">Admin roles (RBAC)</h2>
      <p class="mt-0.5 text-xs text-ink-400">
        superadmin = semua aksi · admin = kelola user/order/ticket · operator = approve
        deposit/order · viewer = read-only
      </p>
    </div>
    {#if data.adminUsers.length === 0}
      <p class="p-6 text-center text-sm text-ink-400">Belum ada user Admin.</p>
    {:else}
      <ul class="divide-y divide-ink-50">
        {#each data.adminUsers as u (u.id)}
          <li class="flex flex-wrap items-center gap-3 p-3 sm:p-4">
            <span
              class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-50 text-xs font-bold text-primary-700"
            >
              {u.username.slice(0, 1).toUpperCase()}
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate font-semibold">@{u.username}</p>
              <p class="truncate text-xs text-ink-400">{u.email || `user#${u.id}`}</p>
            </div>
            <form
              method="POST"
              action="?/assignRole"
              use:enhance={() =>
                async ({ result }) => {
                  const r = result as any;
                  if (result.type === "failure") toast(r.data?.error ?? "Gagal", "error");
                  else toast(r.data?.success ?? "OK", "success");
                  await applyAction(result);
                }}
              class="flex items-center gap-2"
            >
              <input type="hidden" name="userId" value={u.id} />
              <input type="hidden" name="username" value={u.username} />
              <span
                class="rounded-full px-2 py-0.5 text-[10px] font-bold {ROLE_TONE[u.role] ??
                  'bg-ink-100 text-ink-500'}"
              >
                {u.role}
              </span>
              <select
                name="role"
                value={u.role}
                onchange={(e) => (e.currentTarget.form as HTMLFormElement).requestSubmit()}
                class="rounded-lg border border-ink-200 bg-surface px-2 py-1 text-xs font-semibold focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              >
                {#each data.roleList as r}
                  <option value={r}>{r}</option>
                {/each}
              </select>
            </form>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <!-- ===== System status ===== -->
  <div class="rounded-2xl border border-ink-100 bg-surface">
    <div class="border-b border-ink-100 px-4 py-3">
      <h2 class="text-sm font-bold">System status</h2>
      <p class="mt-0.5 text-xs text-ink-400">Snapshot environment + tabel penting.</p>
    </div>
    <div class="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
      {#each checks as c}
        <div
          class="flex items-center justify-between rounded-lg border border-ink-100 bg-surface px-3 py-2"
        >
          <div class="flex items-center gap-2">
            <span
              class="grid h-7 w-7 place-items-center rounded-md {c.ok
                ? 'bg-success-soft text-success'
                : 'bg-warning-soft text-warning'}"
            >
              <Icon name={c.ok ? "check" : "alert"} size={12} stroke={2.5} />
            </span>
            <span class="text-xs font-semibold text-ink-700">{c.label}</span>
          </div>
          <span class="text-[10px] font-semibold text-ink-500">{c.detail ?? ""}</span>
        </div>
      {/each}
    </div>
    <div class="grid grid-cols-2 gap-2 border-t border-ink-100 p-3 lg:grid-cols-4">
      <div class="rounded-lg bg-ink-50 p-2 text-center">
        <p class="text-[10px] font-bold uppercase text-ink-400">User total</p>
        <p class="mt-1 font-display text-lg font-bold tabular-nums">
          {fmt(data.system.usersTotal)}
        </p>
        <p class="text-[10px] text-ink-400">+{fmt(data.system.usersToday)} hari ini</p>
      </div>
      <div class="rounded-lg bg-ink-50 p-2 text-center">
        <p class="text-[10px] font-bold uppercase text-ink-400">Order total</p>
        <p class="mt-1 font-display text-lg font-bold tabular-nums">
          {fmt(data.system.ordersTotal)}
        </p>
      </div>
      <div class="rounded-lg bg-ink-50 p-2 text-center">
        <p class="text-[10px] font-bold uppercase text-ink-400">Order aktif</p>
        <p class="mt-1 font-display text-lg font-bold tabular-nums">
          {fmt(data.system.ordersActive)}
        </p>
      </div>
      <div class="rounded-lg bg-ink-50 p-2 text-center">
        <p class="text-[10px] font-bold uppercase text-ink-400">Queue</p>
        <p class="mt-1 font-display text-lg font-bold tabular-nums">
          {fmt(data.system.queuePending)}
        </p>
        <p class="text-[10px] text-ink-400">job pending</p>
      </div>
    </div>
  </div>
</section>
