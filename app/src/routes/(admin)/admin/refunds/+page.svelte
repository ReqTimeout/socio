<script lang="ts">
  import { enhance } from "$app/forms";
  import { Icon, Button } from "@socio/ui";
  import type { PageData, ActionData } from "./$types";

  let { data, form } = $props<{ data: PageData; form: ActionData }>();
  let rejectReason = $state("");
  let rejectId = $state<number | null>(null);

  const fmtRp = (n: number) => "Rp" + Number(n).toLocaleString("id-ID");
  const fmtDate = (d: string | Date) =>
    new Date(d).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
</script>

<svelte:head>
  <title>Refund Requests — Socio Admin</title>
</svelte:head>

<div class="mx-auto max-w-5xl space-y-6 p-4 lg:p-6">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h1 class="font-display text-xl font-extrabold">Refund Requests</h1>
      <p class="mt-1 text-sm text-ink-500">
        {#if data.pendingCount > 0}
          <span class="font-semibold text-amber-700">{data.pendingCount} pending</span> · butuh approval
          admin kedua (≥ Rp50k)
        {:else}
          Tidak ada pending — refund &lt; Rp50k auto-execute
        {/if}
      </p>
    </div>
    <div class="flex gap-2">
      <a
        href="?filter=pending"
        class="rounded-full px-3 py-1.5 text-xs font-bold {data.filter === 'pending'
          ? 'bg-ink-900 text-white'
          : 'bg-ink-100 text-ink-600'}">Pending</a
      >
      <a
        href="?filter=all"
        class="rounded-full px-3 py-1.5 text-xs font-bold {data.filter === 'all'
          ? 'bg-ink-900 text-white'
          : 'bg-ink-100 text-ink-600'}">Semua</a
      >
      <a
        href="?filter=executed"
        class="rounded-full px-3 py-1.5 text-xs font-bold {data.filter === 'executed'
          ? 'bg-ink-900 text-white'
          : 'bg-ink-100 text-ink-600'}">Executed</a
      >
      <a
        href="?filter=rejected"
        class="rounded-full px-3 py-1.5 text-xs font-bold {data.filter === 'rejected'
          ? 'bg-ink-900 text-white'
          : 'bg-ink-100 text-ink-600'}">Rejected</a
      >
    </div>
  </div>

  {#if form?.error}
    <div class="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger" role="alert">
      {form.error}
    </div>
  {/if}
  {#if form?.success}
    <div class="rounded-xl bg-success/10 px-4 py-3 text-sm font-medium text-success" role="status">
      {form.success}
    </div>
  {/if}

  {#if data.requests.length === 0}
    <div class="rounded-2xl border border-dashed border-ink-200 bg-surface p-8 text-center">
      <Icon name="banknote" size={32} class="mx-auto text-ink-300" />
      <p class="mt-2 text-sm font-bold text-ink-700">Tidak ada refund request</p>
      <p class="mt-1 text-xs text-ink-500">
        Refund &lt; Rp50k auto, ≥ Rp50k muncul di sini untuk approval.
      </p>
    </div>
  {:else}
    <div class="overflow-hidden rounded-2xl border border-ink-100 bg-surface">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-ink-50 text-left text-xs font-bold uppercase tracking-wide text-ink-500">
            <tr>
              <th class="px-4 py-3">Order</th>
              <th class="px-4 py-3">User</th>
              <th class="px-4 py-3">Amount</th>
              <th class="px-4 py-3">Reason</th>
              <th class="px-4 py-3">Status</th>
              <th class="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ink-100">
            {#each data.requests as r}
              <tr class="hover:bg-ink-50/60">
                <td class="px-4 py-3">
                  <div class="font-mono text-xs font-bold">#{r.orderId}</div>
                  <div class="truncate text-xs text-ink-500">{r.orderService ?? "-"}</div>
                  <div class="text-[11px] text-ink-400">{fmtDate(r.createdAt)}</div>
                </td>
                <td class="px-4 py-3">
                  <div class="text-xs font-bold">@{r.username ?? r.userId}</div>
                  <div class="text-[11px] text-ink-400">by #{r.requestedBy}</div>
                </td>
                <td class="px-4 py-3 font-mono text-xs font-bold">{fmtRp(r.amount)}</td>
                <td class="px-4 py-3 text-xs">{r.reason}</td>
                <td class="px-4 py-3">
                  <span
                    class="inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold
                    {r.status === 'pending'
                      ? 'bg-amber-100 text-amber-700'
                      : r.status === 'executed'
                        ? 'bg-success/10 text-success'
                        : r.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-danger/10 text-danger'}"
                  >
                    {r.status}
                  </span>
                </td>
                <td class="px-4 py-3">
                  {#if r.status === "pending"}
                    <div class="flex gap-1">
                      <form method="POST" action="?/approve" use:enhance>
                        <input type="hidden" name="id" value={r.id} />
                        <Button type="submit" size="sm">Approve</Button>
                      </form>
                      <button
                        type="button"
                        onclick={() => {
                          rejectId = r.id;
                          rejectReason = "";
                        }}
                        class="rounded-full border border-ink-200 bg-surface px-3 py-1 text-xs font-bold text-ink-700 hover:bg-ink-50"
                      >
                        Reject
                      </button>
                    </div>
                  {:else}
                    <span class="text-xs text-ink-400">—</span>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  {#if rejectId !== null}
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <form
        method="POST"
        action="?/reject"
        use:enhance
        class="w-full max-w-sm rounded-2xl bg-surface p-5 shadow-xl"
        onsubmit={() => {
          // close after submit is handled by enhance
        }}
      >
        <h2 class="font-bold">Tolak refund #{rejectId}</h2>
        <p class="mt-1 text-sm text-ink-500">Alasan wajib diisi.</p>
        <input type="hidden" name="id" value={rejectId ?? ""} />
        <textarea
          name="reason"
          bind:value={rejectReason}
          placeholder="Alasan: ..."
          required
          class="mt-3 h-20 w-full rounded-xl border border-ink-200 px-3 py-2 text-sm"
        ></textarea>
        <div class="mt-4 flex gap-2">
          <Button type="button" variant="ghost" onclick={() => (rejectId = null)}>Batal</Button>
          <Button type="submit" variant="danger">Tolak</Button>
        </div>
      </form>
    </div>
  {/if}
</div>
