<script lang="ts">
  import { StatusBadge, Button, Icon, EmptyState, toast, haptic, revealDelay } from "@socio/ui";
  import { serviceDisplayName, formatDateShort } from "$lib/format";
  import { refillCopy } from "$lib/refill-copy";
  import { goto } from "$app/navigation";
  import { enhance } from "$app/forms";
  import { page } from "$app/stores";

  let { data } = $props();
  // .id tanpa i18n — objek string Indonesia lokal, bentuk mengikuti katalog .my
  // supaya markup referensi tetap valid (handover §10.4).
  const c = { app: refillCopy };

  type Row = NonNullable<(typeof data)["rows"]>[number];
  type TabKey = "refillable" | "progress" | "all";

  // data.tab dari URL bebas (string) — kunci peta empty-state dengan aman,
  // fallback 'refillable' supaya tak ada index-error & tak pernah undefined.
  const emptyFor = $derived(
    c.app.refill.empty[(data.tab as TabKey) in c.app.refill.empty ? (data.tab as TabKey) : "refillable"],
  );

  let rows = $state<(typeof data)["rows"]>(data.rows);
  $effect(() => {
    rows = data.rows;
  });

  // Order yang sedang dikirim request refill-nya → button disabled + spinner.
  let submitting = $state<Set<number>>(new Set());

  const tabs = $derived([
    { t: "refillable", label: c.app.refill.tabs.refillable, count: data.counts.refillable },
    { t: "progress", label: c.app.refill.tabs.progress, count: data.counts.progress },
    { t: "all", label: c.app.refill.tabs.all, count: data.counts.all },
  ]);

  function select(t: string) {
    haptic(8);
    const p = new URLSearchParams($page.url.searchParams);
    if (t === "refillable") p.delete("t");
    else p.set("t", t);
    goto(`/refill?${p.toString()}`);
  }

  function num(n: number | string | null | undefined): string {
    const v = Number(n ?? 0);
    return Number.isFinite(v) ? v.toLocaleString("id-ID") : "0";
  }

  function timeAgo(d: Date | string) {
    const date = typeof d === "string" ? new Date(d) : d;
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60) return c.app.pesanan.timeAgo.just;
    if (diff < 3600) return c.app.pesanan.timeAgo.minutesAgo(Math.floor(diff / 60));
    if (diff < 86400) return c.app.pesanan.timeAgo.hoursAgo(Math.floor(diff / 3600));
    return formatDateShort(date);
  }

  // Bar drop determinate: sisa/qty. Untuk refill, yang menarik = seberapa banyak
  // yang turun sejak selesai (qty − remains). Kita tampilkan bar "masih tersisa".
  function keepPct(o: Row): number {
    const qty = Number(o.quantity ?? 0);
    const rem = Number(o.remains ?? 0);
    if (!qty) return 100;
    return Math.min(100, Math.max(0, (rem / qty) * 100));
  }

  // ── jendela waktu: format absolut + countdown relatif (hidup tanpa reload) ──
  const localeStr = "id";
  const DAY = 86_400_000, HOUR = 3_600_000, MIN = 60_000;
  const dtfmt = new Intl.DateTimeFormat(localeStr, { dateStyle: "medium", timeStyle: "short" });

  let nowTick = $state(Date.now());
  $effect(() => {
    const id = setInterval(() => (nowTick = Date.now()), 30_000);
    return () => clearInterval(id);
  });

  function fmtWhen(ms: number | null): string {
    return ms ? dtfmt.format(new Date(ms)) : "";
  }
  function relLeft(target: number | null): string {
    if (!target) return "";
    const diff = target - nowTick;
    if (diff <= 0) return "";
    const dur = c.app.refill.card.dur;
    const d = Math.floor(diff / DAY);
    const h = Math.floor((diff % DAY) / HOUR);
    const m = Math.floor((diff % HOUR) / MIN);
    if (d > 0) return `${d}${dur.d} ${h}${dur.h}`;
    if (h > 0) return `${h}${dur.h} ${m}${dur.m}`;
    return `${m}${dur.m}`;
  }

  async function doRefill(o: Row) {
    if (submitting.has(o.id)) return;
    submitting = new Set(submitting).add(o.id);
  }
  function clearSubmitting(id: number) {
    const n = new Set(submitting);
    n.delete(id);
    submitting = n;
  }
</script>

<svelte:head>
  <title>{c.app.refill.title}</title>
  <meta name="description" content={c.app.refill.metaDescription} />
</svelte:head>

<section class="space-y-3 lg:space-y-5">
  <h1 class="sr-only">{c.app.refill.srHeading}</h1>

  <!-- Header: judul + bantuan + tautan balik ke semua pesanan -->
  <div class="flex items-start justify-between gap-3">
    <div>
      <h2 class="text-lg font-extrabold tracking-tight text-ink-900 lg:text-2xl">
        {c.app.refill.pageHeading}
      </h2>
      <p class="mt-0.5 max-w-prose text-[12.5px] leading-snug text-ink-500">
        {c.app.refill.pageHelp}
      </p>
    </div>
    <a
      href="/pesanan"
      class="shrink-0 rounded-full border border-ink-200 bg-white px-3 py-1.5 text-xs font-bold text-ink-600 transition-colors hover:border-ink-300 hover:text-ink-900"
    >
      <span class="inline-flex items-center gap-1">
        <Icon name="receipt" size={13} />{c.app.refill.backToOrders}
      </span>
    </a>
  </div>

  <!-- Ringkasan + catatan gratis -->
  <div class="flex flex-wrap items-center gap-2">
    <span
      class="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700 ring-1 ring-emerald-600/15"
    >
      <Icon name="refresh" size={13} stroke={2.4} />
      {c.app.refill.summary(num(data.counts.refillable))}
    </span>
    <span class="inline-flex items-center gap-1 text-[11.5px] font-semibold text-ink-500">
      <Icon name="info" size={12} />{c.app.refill.note}
    </span>
  </div>

  <!-- Tab chip -->
  <div class="flex items-center gap-2 overflow-x-auto pb-1" role="tablist">
    {#each tabs as tb (tb.t)}
      <button
        type="button"
        role="tab"
        aria-selected={data.tab === tb.t}
        onclick={() => select(tb.t)}
        class="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-bold transition-all {data.tab ===
        tb.t
          ? 'border-2 border-ink-900 bg-primary text-white shadow-[2px_2px_0_var(--color-ink-900)]'
          : 'border border-ink-200 bg-white text-ink-600 hover:border-ink-300'}"
      >
        {tb.label}
        <span
          class="rounded-full px-1.5 py-0.5 text-[10.5px] tabular-nums {data.tab === tb.t
            ? 'bg-white/25'
            : 'bg-ink-100 text-ink-500'}">{tb.count}</span
        >
      </button>
    {/each}
  </div>

  {#if rows.length === 0}
    <EmptyState title={emptyFor.title} description={emptyFor.desc}>
      <Button href="/pesanan" variant="ghost" size="sm"
        ><Icon name="receipt" size={14} /> {c.app.refill.backToOrders}</Button
      >
    </EmptyState>
  {:else}
    <div class="space-y-3">
      {#each rows as o, i (o.id)}
        <article
          style={revealDelay(i, 0, 60)}
          class="reveal card-refill rounded-2xl border border-ink-200 bg-white p-4 shadow-sm"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <h3 class="truncate text-sm font-extrabold text-ink-900" title={o.serviceName}>
                {serviceDisplayName(o.serviceName)}
              </h3>
              <p class="mt-0.5 truncate text-[11.5px] text-ink-500" title={o.data}>
                {o.data}
              </p>
            </div>
            <div class="flex shrink-0 flex-col items-end gap-1">
              <StatusBadge status={o.status} />
              <span class="text-[10.5px] font-bold tabular-nums text-ink-400">#{o.id}</span>
            </div>
          </div>

          <!-- Statistik: dipesan · tersisa · estimasi refillable -->
          <div class="mt-3 grid grid-cols-3 gap-2">
            <div class="rounded-xl bg-ink-50 px-2.5 py-2">
              <div class="text-[9.5px] font-bold uppercase tracking-wide text-ink-400">
                {c.app.refill.card.ordered}
              </div>
              <div class="mt-0.5 text-sm font-extrabold tabular-nums text-ink-800">
                {num(o.quantity)}
              </div>
            </div>
            <div class="rounded-xl bg-ink-50 px-2.5 py-2">
              <div class="text-[9.5px] font-bold uppercase tracking-wide text-ink-400">
                {c.app.refill.card.remaining}
              </div>
              <div class="mt-0.5 text-sm font-extrabold tabular-nums text-ink-800">
                {num(o.remains)}
              </div>
            </div>
            <div
              class="rounded-xl px-2.5 py-2 {o.state === 'refillable'
                ? 'bg-emerald-50'
                : 'bg-ink-50'}"
            >
              <div
                class="text-[9.5px] font-bold uppercase tracking-wide {o.state === 'refillable'
                  ? 'text-emerald-600'
                  : 'text-ink-400'}"
              >
                ♻ {c.app.refill.tabs.refillable}
              </div>
              <div
                class="mt-0.5 text-sm font-extrabold tabular-nums {o.state === 'refillable'
                  ? 'text-emerald-700'
                  : 'text-ink-500'}"
              >
                {o.state === "clean" ? num(0) : num(o.estimate)}
              </div>
            </div>
          </div>

          <!-- Bar "masih tersisa" (hanya saat ada data qty) -->
          {#if Number(o.quantity) > 0}
            <div
              class="mt-2.5 h-1.5 overflow-hidden rounded-full bg-ink-100"
              role="progressbar"
              aria-valuenow={Math.round(keepPct(o))}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                class="h-full rounded-full {o.state === 'refillable'
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'}"
                style="width:{keepPct(o)}%"
              ></div>
            </div>
          {/if}

          <!-- Aksi / status sesuai state -->
          <div class="mt-3">
            {#if o.state === "refillable"}
              <form
                method="POST"
                action="?/refill"
                use:enhance={() => {
                  return async ({ result, update }) => {
                    clearSubmitting(o.id);
                    if (result.type === "failure") {
                      toast((result.data as any)?.error ?? c.app.pesanan.toast.failed, "error");
                    } else if (result.type === "success") {
                      toast(c.app.pesanan.toast.refillOk, "success");
                    }
                    await update();
                  };
                }}
              >
                <input type="hidden" name="id" value={o.id} />
                <button
                  type="submit"
                  disabled={submitting.has(o.id)}
                  onclick={() => doRefill(o)}
                  class="flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border-2 border-ink-900 bg-emerald-50 px-3 text-[13px] font-extrabold text-emerald-700 shadow-[2px_2px_0_var(--color-ink-900)] transition-all hover:bg-emerald-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60"
                >
                  <Icon name="refresh" size={15} stroke={2.6} class={submitting.has(o.id) ? "animate-spin" : ""} />
                  {c.app.refill.card.button}
                  <span class="ml-1 rounded-full bg-emerald-600/10 px-2 py-0.5 text-[11px] tabular-nums">
                    {c.app.refill.card.estimate(num(o.estimate))}
                  </span>
                </button>
              </form>
              {#if o.refillUntil}
                <p class="mt-1.5 text-center text-[11px] font-semibold text-ink-400">
                  {c.app.refill.card.validUntil(fmtWhen(o.refillUntil))}
                </p>
              {/if}
            {:else if o.state === "cooldown"}
              <div
                class="flex items-center justify-center gap-1.5 rounded-xl bg-sky-50 px-3 py-2.5 text-[12.5px] font-bold text-sky-700 ring-1 ring-sky-600/15"
              >
                <Icon name="clock" size={14} />
                {c.app.refill.card.waiting(relLeft(o.nextAvailableAt))}
              </div>
              {#if o.nextAvailableAt}
                <p class="mt-1.5 text-center text-[11px] font-semibold text-ink-400">
                  {c.app.refill.card.nextIn(fmtWhen(o.nextAvailableAt))}
                </p>
              {/if}
            {:else if o.state === "expired"}
              <div
                class="flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2.5 text-[12px] font-semibold text-rose-600 ring-1 ring-rose-600/15"
              >
                <Icon name="info" size={14} />
                {c.app.refill.card.expired}
              </div>
            {:else if o.state === "progress"}
              <div
                class="flex items-center justify-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2.5 text-[12.5px] font-bold text-amber-700 ring-1 ring-amber-600/15"
              >
                <Icon name="refresh" size={14} class="animate-spin" />
                {c.app.refill.card.requested}
              </div>
            {:else if o.state === "clean"}
              <div
                class="flex items-center justify-center gap-1.5 rounded-xl bg-ink-50 px-3 py-2.5 text-[12px] font-semibold text-ink-500"
              >
                <Icon name="shield" size={14} />
                {c.app.refill.card.upToDate} · {c.app.refill.card.noDrop}
              </div>
              {#if o.refillUntil}
                <p class="mt-1.5 text-center text-[11px] font-semibold text-ink-400">
                  {c.app.refill.card.validUntil(fmtWhen(o.refillUntil))}
                </p>
              {/if}
            {:else}
              <div
                class="flex items-center justify-center gap-1.5 rounded-xl bg-ink-50 px-3 py-2.5 text-[12px] font-semibold text-ink-500"
              >
                <Icon name="clock" size={14} />
                {o.status}
              </div>
            {/if}
          </div>

          <div class="mt-2.5 flex items-center justify-between border-t border-ink-100 pt-2 text-[11px] font-semibold text-ink-400">
            <span class="inline-flex items-center gap-1">
              <Icon name="clock" size={12} />{timeAgo(o.createdAt)}
            </span>
            <span class="inline-flex items-center gap-1">
              <Icon name="shield" size={12} />{c.app.pesanan.card.refillBadge}
            </span>
          </div>
        </article>
      {/each}
    </div>
  {/if}
</section>

<style>
  .card-refill {
    transition:
      box-shadow 0.15s ease,
      transform 0.15s ease;
  }
  .card-refill:hover {
    box-shadow: 0 2px 14px -6px rgb(0 0 0 / 0.14);
  }
</style>
