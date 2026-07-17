<script lang="ts">
  import { Button, ConfirmDialog, toast } from "@socio/ui";
  import { haptic } from "@socio/ui";
  import { applyAction, enhance } from "$app/forms";
  import { formatRupiah } from "$lib/format";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let q = $state(data.q);
  let adjustId = $state<number | null>(null);
  let amount = $state(0);
  let reason = $state("");
  let suspendId = $state<number | null>(null);
  let confirmOpen = $state(false);
</script>

<section class="space-y-4">
  <div class="flex items-center justify-between gap-2">
    <h1 class="font-display text-xl font-bold">Users</h1>
    <form method="GET" class="flex gap-2">
      <input
        name="q"
        bind:value={q}
        placeholder="Cari username…"
        class="h-9 rounded-xl border border-ink-200 px-3 text-sm"
      />
      <Button type="submit" size="sm">Cari</Button>
    </form>
  </div>

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

  <!-- Desktop table -->
  <div class="hidden overflow-x-auto rounded-2xl border border-ink-100 bg-surface lg:block">
    <table class="w-full text-sm">
      <thead class="border-b border-ink-100 text-left text-xs text-ink-500">
        <tr>
          <th class="p-3">ID</th><th class="p-3">User</th><th class="p-3">Level</th>
          <th class="p-3">Saldo</th><th class="p-3">Status</th><th class="p-3">Aksi</th>
        </tr>
      </thead>
      <tbody>
        {#each data.users as u (u.id)}
          <tr class="border-b border-ink-50 last:border-0">
            <td class="p-3 tabular-nums">{u.id}</td>
            <td class="p-3"
              ><div class="font-medium">{u.username}</div>
              <div class="text-xs text-ink-400">{u.email}</div></td
            >
            <td class="p-3">{u.level}</td>
            <td class="p-3 tabular-nums">{formatRupiah(u.balance)}</td>
            <td class="p-3">{u.status === "1" ? "Active" : "Suspended"}</td>
            <td class="p-3">
              <div class="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onclick={() => {
                    adjustId = u.id;
                    amount = 0;
                    reason = "";
                  }}>Adjust</Button
                >
                <Button
                  size="sm"
                  variant="ghost"
                  onclick={() => {
                    suspendId = u.id;
                    confirmOpen = true;
                  }}>Suspend</Button
                >
              </div>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Mobile card-list -->
  <ul class="space-y-2 lg:hidden">
    {#each data.users as u (u.id)}
      <li class="rounded-2xl border border-ink-100 bg-surface p-3">
        <div class="flex items-center justify-between">
          <div>
            <span class="font-semibold">{u.username}</span>
            <span class="text-xs text-ink-400">#{u.id}</span>
          </div>
          <span class="text-xs font-medium {u.status === '1' ? 'text-success' : 'text-danger'}"
            >{u.status === "1" ? "Active" : "Suspended"}</span
          >
        </div>
        <div class="mt-1 flex items-center justify-between text-xs text-ink-500">
          <span>{u.level} · {formatRupiah(u.balance)}</span>
        </div>
        <div class="mt-2 flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onclick={() => {
              adjustId = u.id;
              amount = 0;
              reason = "";
            }}>Adjust</Button
          >
          <Button
            size="sm"
            variant="ghost"
            onclick={() => {
              suspendId = u.id;
            }}>Suspend</Button
          >
        </div>
      </li>
    {/each}
  </ul>

  <!-- Pagination -->
  {#if data.pages > 1}
    <div class="flex justify-center gap-2">
      {#each Array(data.pages) as _, i}
        <a
          href="/admin/users?q={data.q}&p={i + 1}"
          class="rounded-lg px-3 py-1 text-sm {data.page === i + 1
            ? 'bg-ink-900 text-white'
            : 'bg-ink-100'}">{i + 1}</a
        >
      {/each}
    </div>
  {/if}
</section>

<!-- Adjust modal -->
{#if adjustId !== null}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
    <form
      method="POST"
      action="?/adjust"
      use:enhance={() => async (input: any) => {
        if (input.result.type === "failure")
          toast((input.result.data as any)?.error ?? "Gagal", "error");
        else toast((input.result.data as any)?.success ?? "OK", "success");
        adjustId = null;
        await applyAction(input.result);
      }}
      class="w-full max-w-sm space-y-3 rounded-2xl bg-surface p-5"
    >
      <h3 class="font-display font-bold">Adjust Saldo #{adjustId}</h3>
      <input type="hidden" name="id" value={adjustId} />
      <input
        name="amount"
        type="number"
        bind:value={amount}
        placeholder="Jumlah (+/-)"
        class="h-10 w-full rounded-xl border border-ink-200 px-3 text-sm"
      />
      <input
        name="reason"
        bind:value={reason}
        placeholder="Alasan (wajib)"
        class="h-10 w-full rounded-xl border border-ink-200 px-3 text-sm"
        required
      />
      <div class="flex gap-2">
        <Button type="submit" class="flex-1">Simpan</Button>
        <Button type="button" variant="ghost" onclick={() => (adjustId = null)}>Batal</Button>
      </div>
    </form>
  </div>
{/if}

<!-- Suspend confirm -->
<ConfirmDialog
  bind:open={confirmOpen}
  title="Suspend User"
  message="Yakin ingin ubah status user ini?"
>
  <form
    method="POST"
    action="?/suspend"
    use:enhance={() => async (input: any) => {
      if (input.result.type === "failure")
        toast((input.result.data as any)?.error ?? "Gagal", "error");
      else toast((input.result.data as any)?.success ?? "OK", "success");
      suspendId = null;
      await applyAction(input.result);
    }}
  >
    <input type="hidden" name="id" value={suspendId ?? 0} />
    <div class="flex gap-2">
      <Button type="submit" variant="danger" class="flex-1">Ya, Lanjut</Button>
      <Button type="button" variant="ghost" onclick={() => (suspendId = null)}>Batal</Button>
    </div>
  </form>
</ConfirmDialog>
