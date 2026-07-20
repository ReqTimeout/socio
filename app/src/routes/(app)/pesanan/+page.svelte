<script lang="ts">
  import { StatusBadge, EmptyState, Sheet, Button, Icon, toast } from "@socio/ui";
  import { haptic } from "@socio/ui";
  import { formatRupiah } from "$lib/format";
  import { goto } from "$app/navigation";
  import { applyAction, enhance } from "$app/forms";
  import { page } from "$app/stores";
  import type { PageData } from "./$types";

  let { data } = $props();

  const tabs = [
    { f: "all", label: "Semua" },
    { f: "pending", label: "Pending" },
    { f: "proses", label: "Proses" },
    { f: "selesai", label: "Selesai" },
    { f: "gagal", label: "Gagal" },
  ];

  let selected = $state<number | null>(null);
  let sheetOpen = $state(false);
  let confirmAction = $state<"refill" | "cancel" | null>(null);
  let confirmOpen = $state(false);

  let selectMode = $state(false);
  let checked = $state<Set<number>>(new Set());

  let orders = $state(data.orders);
  $effect(() => {
    orders = data.orders;
  });

  const checkedIds = $derived([...checked]);
  const massRefundable = $derived(
    orders.filter((o) => checked.has(o.id) && o.status === "Pending"),
  );
  const massRefundTotal = $derived(massRefundable.reduce((s, o) => s + Number(o.price), 0));

  function toggleSelectMode() {
    haptic(8);
    selectMode = !selectMode;
    if (!selectMode) checked = new Set();
  }
  function toggleCheck(id: number) {
    haptic(8);
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    checked = next;
  }

  if (typeof window !== "undefined") {
    const es = new EventSource("/api/sse");
    es.addEventListener("order_update", (e) => {
      const { id, status, remains } = JSON.parse((e as MessageEvent).data);
      orders = orders.map((o) =>
        o.id === id ? { ...o, status, remains: remains ?? o.remains } : o,
      );
      if (selected === id) haptic(12);
    });
  }

  function select(f: string) {
    haptic(8);
    const p = new URLSearchParams($page.url.searchParams);
    if (f === "all") p.delete("f");
    else p.set("f", f);
    goto(`/pesanan?${p.toString()}`);
  }

  function openDetail(id: number) {
    haptic(10);
    selected = id;
    sheetOpen = true;
  }

  function timeAgo(d: Date | string) {
    const date = typeof d === "string" ? new Date(d) : d;
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60) return "baru";
    if (diff < 3600) return `${Math.floor(diff / 60)}m lalu`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}j lalu`;
    return date.toLocaleDateString("id-ID");
  }

  const detail = $derived(orders.find((o) => o.id === selected) ?? null);

  function copyLink(link: string) {
    navigator.clipboard?.writeText(link);
    haptic(8);
    toast("Link disalin", "success");
  }

  function repeatOrder(o: (typeof orders)[0]) {
    haptic(12);
    sheetOpen = false;
    goto(`/pesan?service=${o.serviceId}&link=${encodeURIComponent(o.data)}&qty=${o.quantity}`);
  }

  function askRefill() {
    confirmAction = "refill";
    confirmOpen = true;
  }
  function askCancel() {
    confirmAction = "cancel";
    confirmOpen = true;
  }

  const confirmText = $derived(
    confirmAction === "refill"
      ? "Ajukan refill untuk order ini? Refill gratis, mengisi ulang followers yang turun."
      : "Batalkan order ini? Saldo akan dikembalikan otomatis ke akun kamu.",
  );
</script>

<section class="space-y-3">
  <!-- Filter chips -->
  <div class="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
    {#each tabs as t}
      <button
        onclick={() => select(t.f)}
        class="shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 active:scale-95
          {data.filter === t.f
          ? 'bg-primary text-white shadow-sm'
          : 'bg-ink-100 text-ink-600 hover:bg-ink-200'}"
      >
        {t.label}
      </button>
    {/each}
    <button
      onclick={toggleSelectMode}
      class="ml-auto shrink-0 rounded-full px-3 py-2 text-xs font-bold transition-all active:scale-95
        {selectMode ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-600 hover:bg-ink-200'}"
    >
      {selectMode ? "Batal" : "Pilih"}
    </button>
  </div>

  {#if orders.length === 0}
    <div class="rounded-2xl border border-dashed border-ink-200 bg-surface p-8 text-center">
      <div class="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-full bg-ink-100 text-ink-400">
        <Icon name="receipt" size={28} />
      </div>
      <p class="text-sm font-bold">Belum ada pesanan</p>
      <p class="mt-1 text-xs text-ink-500">Pesanan kamu akan muncul di sini.</p>
      <a
        href="/pesan"
        class="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-bold text-white transition-all active:scale-95 hover:bg-primary-800"
      >
        <Icon name="plus" size={16} stroke={2.5} />
        Buat Pesanan
      </a>
    </div>
  {:else}
    <ul class="space-y-2.5">
      {#each orders as o, i (o.id)}
        <li
          class="rounded-2xl border bg-surface p-4 transition-all duration-200
            {checked.has(o.id) ? 'border-primary ring-1 ring-primary' : 'border-ink-100'}
            motion-safe:animate-[slide-up_400ms_cubic-bezier(0.25,1,0.5,1)_backwards]"
          style="animation-delay: {i * 40}ms"
        >
          <div class="flex items-center gap-3">
            {#if selectMode}
              <button
                type="button"
                onclick={() => toggleCheck(o.id)}
                aria-label="Pilih order"
                class="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition active:scale-90
                  {checked.has(o.id)
                  ? 'border-primary bg-primary text-white'
                  : 'border-ink-300 text-transparent'}"
              >
                <Icon name="check" size={14} stroke={3} />
              </button>
            {/if}
            <button
              onclick={() => (selectMode ? toggleCheck(o.id) : openDetail(o.id))}
              class="block min-w-0 flex-1 text-left"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-bold">{o.serviceName}</p>
                  <p class="mt-0.5 truncate text-xs text-ink-500">{o.data}</p>
                </div>
                <StatusBadge status={o.status} />
              </div>
              <div class="mt-2.5 flex items-center justify-between text-xs">
                <span class="font-semibold tabular-nums text-ink-600">
                  {o.quantity.toLocaleString("id-ID")} qty · {formatRupiah(o.price)}
                </span>
                <span class="text-ink-400">{timeAgo(o.createdAt)}</span>
              </div>
            </button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<!-- Mass action bar -->
{#if selectMode && checkedIds.length > 0}
  <form
    method="POST"
    action="?/massCancel"
    use:enhance={() => {
      return async ({ result }) => {
        if (result.type === "failure") {
          toast((result.data as any)?.error ?? "Gagal", "error");
        } else if (result.type === "success") {
          toast((result.data as any)?.success ?? "Refund massal berhasil", "success");
          checked = new Set();
          selectMode = false;
          await applyAction(result);
        }
      };
    }}
  >
    <input type="hidden" name="ids" value={checkedIds.join(",")} />
    <div
      class="fixed inset-x-0 bottom-0 z-40 border-t border-ink-100 bg-surface/95 p-3 backdrop-blur
        pb-[calc(env(safe-area-inset-bottom)+0.75rem)]"
    >
      <div class="mx-auto flex max-w-lg items-center gap-3">
        <div class="text-xs font-medium text-ink-600">
          {massRefundable.length} order · refund
          <span class="font-bold text-primary">{formatRupiah(massRefundTotal)}</span>
        </div>
        <Button type="submit" variant="danger" full disabled={!massRefundable.length}>
          <Icon name="x" size={16} />
          Batalkan & Refund
        </Button>
      </div>
    </div>
  </form>
{/if}

<!-- Detail Sheet -->
<Sheet bind:open={sheetOpen} title="Detail Pesanan">
  {#if detail}
    <div class="space-y-4">
      <!-- Header -->
      <div class="rounded-2xl bg-gradient-to-br from-ink-50 to-ink-100 p-4">
        <p class="text-sm font-bold">{detail.serviceName}</p>
        <div class="mt-2 flex items-center gap-2">
          <StatusBadge status={detail.status} />
          <span class="text-xs text-ink-500">#{detail.id}</span>
        </div>
      </div>

      <!-- Link -->
      <div class="rounded-2xl border border-ink-200 p-4">
        <div class="mb-1.5 flex items-center justify-between">
          <span class="text-xs font-semibold text-ink-600">Link / Username</span>
          <button
            type="button"
            onclick={() => copyLink(detail.data)}
            class="flex items-center gap-1 text-xs font-bold text-primary transition active:scale-90"
          >
            <Icon name="copy" size={12} />
            Salin
          </button>
        </div>
        <p class="break-all text-sm text-ink-800">{detail.data}</p>
      </div>

      <!-- Info grid -->
      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-xl bg-ink-50 p-3">
          <div class="text-[10px] font-semibold text-ink-500">Jumlah</div>
          <div class="mt-0.5 font-display text-base font-bold tabular-nums">
            {detail.quantity.toLocaleString("id-ID")}
          </div>
        </div>
        <div class="rounded-xl bg-ink-50 p-3">
          <div class="text-[10px] font-semibold text-ink-500">Sisa</div>
          <div class="mt-0.5 font-display text-base font-bold tabular-nums">
            {detail.remains?.toLocaleString("id-ID") ?? "0"}
          </div>
        </div>
        <div class="rounded-xl bg-ink-50 p-3">
          <div class="text-[10px] font-semibold text-ink-500">Harga</div>
          <div class="mt-0.5 font-display text-base font-bold tabular-nums text-primary">
            {formatRupiah(detail.price)}
          </div>
        </div>
        <div class="rounded-xl bg-ink-50 p-3">
          <div class="text-[10px] font-semibold text-ink-500">Waktu</div>
          <div class="mt-0.5 text-xs font-semibold">{timeAgo(detail.createdAt)}</div>
        </div>
      </div>

      <!-- Actions -->
      <div class="space-y-2 pt-2">
        <Button full onclick={() => repeatOrder(detail)}>
          <Icon name="refresh" size={16} />
          Pesan Ulang
        </Button>

        {#if detail.isRefill && detail.status === "Success"}
          <form
            method="POST"
            action="?/refill"
            use:enhance={() => {
              return async ({ result }) => {
                if (result.type === "failure") {
                  toast((result.data as any)?.error ?? "Gagal", "error");
                } else {
                  toast("Refill diajukan", "success");
                  sheetOpen = false;
                  await applyAction(result);
                }
              };
            }}
          >
            <input type="hidden" name="id" value={detail.id} />
            <Button type="submit" variant="accent" full>
              <Icon name="refresh" size={16} />
              Refill
            </Button>
          </form>
        {/if}

        {#if detail.status === "Pending"}
          <form
            method="POST"
            action="?/cancel"
            use:enhance={() => {
              return async ({ result }) => {
                if (result.type === "failure") {
                  toast((result.data as any)?.error ?? "Gagal", "error");
                } else {
                  toast("Order dibatalkan, saldo dikembalikan", "success");
                  sheetOpen = false;
                  await applyAction(result);
                }
              };
            }}
          >
            <input type="hidden" name="id" value={detail.id} />
            <Button type="submit" variant="danger" full>
              <Icon name="x" size={16} />
              Batalkan Order
            </Button>
          </form>
        {/if}
      </div>
    </div>
  {/if}
</Sheet>

<style>
  @keyframes slide-up {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
