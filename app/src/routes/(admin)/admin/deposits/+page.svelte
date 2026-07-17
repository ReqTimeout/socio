<script lang="ts">
  import { Button, ConfirmDialog, toast } from "@socio/ui";
  import { applyAction, enhance } from "$app/forms";
  import { formatRupiah } from "$lib/format";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let confirmId = $state<number | null>(null);
  let rejectId = $state<number | null>(null);
  let modalOpen = $state(false);
  let rejectOpen = $state(false);

  function timeAgo(d: Date | string) {
    return new Date(d).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
</script>

<section class="space-y-4">
  <h1 class="font-display text-xl font-bold">Deposits</h1>
  {#if form?.error}<div class="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
      {form.error}
    </div>{/if}
  {#if form?.success}<div
      class="rounded-xl bg-success/10 px-3 py-2 text-sm font-medium text-success"
    >
      {form.success}
    </div>{/if}

  <!-- Desktop table -->
  <div class="hidden overflow-x-auto rounded-2xl border border-ink-100 bg-surface lg:block">
    <table class="w-full text-sm">
      <thead class="border-b border-ink-100 text-left text-xs text-ink-500">
        <tr
          ><th class="p-3">ID</th><th class="p-3">User</th><th class="p-3">Metode</th><th
            class="p-3">Jumlah</th
          ><th class="p-3">Status</th><th class="p-3">Waktu</th><th class="p-3">Aksi</th></tr
        >
      </thead>
      <tbody>
        {#each data.deposits as d (d.id)}
          <tr class="border-b border-ink-50 last:border-0">
            <td class="p-3 tabular-nums">{d.id}</td>
            <td class="p-3">{d.userId}</td>
            <td class="p-3">{d.methodName}</td>
            <td class="p-3 tabular-nums">{formatRupiah(d.amount)}</td>
            <td class="p-3">{d.status}</td>
            <td class="p-3 text-xs text-ink-400">{timeAgo(d.createdAt)}</td>
            <td class="p-3">
              {#if d.status !== "Success"}
                <div class="flex gap-2">
                  <Button
                    size="sm"
                    onclick={() => {
                      confirmId = d.id;
                      modalOpen = true;
                    }}>Confirm</Button
                  >
                  <Button
                    size="sm"
                    variant="ghost"
                    onclick={() => {
                      rejectId = d.id;
                      rejectOpen = true;
                    }}>Reject</Button
                  >
                </div>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Mobile -->
  <ul class="space-y-2 lg:hidden">
    {#each data.deposits as d (d.id)}
      <li class="rounded-2xl border border-ink-100 bg-surface p-3">
        <div class="flex items-center justify-between">
          <span class="font-semibold">#{d.id}</span>
          <span
            class="text-sm font-medium {d.status === 'Success'
              ? 'text-success'
              : d.status === 'Canceled'
                ? 'text-danger'
                : 'text-ink-500'}">{d.status}</span
          >
        </div>
        <div class="mt-1 text-xs text-ink-500">
          {d.methodName} · {formatRupiah(d.amount)} · {timeAgo(d.createdAt)}
        </div>
        {#if d.status !== "Success"}
          <div class="mt-2 flex gap-2">
            <Button
              size="sm"
              onclick={() => {
                confirmId = d.id;
                modalOpen = true;
              }}>Confirm</Button
            >
            <Button
              size="sm"
              variant="ghost"
              onclick={() => {
                rejectId = d.id;
                rejectOpen = true;
              }}>Reject</Button
            >
          </div>
        {/if}
      </li>
    {/each}
  </ul>
</section>

<ConfirmDialog
  bind:open={modalOpen}
  title="Konfirmasi Deposit"
  message="Saldo user akan ditambah. Lanjut?"
>
  <form
    method="POST"
    action="?/confirm"
    use:enhance={() => async (input: any) => {
      if (input.result.type === "failure")
        toast((input.result.data as any)?.error ?? "Gagal", "error");
      else toast((input.result.data as any)?.success ?? "OK", "success");
      modalOpen = false;
      await applyAction(input.result);
    }}
  >
    <input type="hidden" name="id" value={confirmId ?? 0} />
    <div class="flex gap-2">
      <Button type="submit" class="flex-1">Ya, Konfirmasi</Button>
      <Button type="button" variant="ghost" onclick={() => (modalOpen = false)}>Batal</Button>
    </div>
  </form>
</ConfirmDialog>

<ConfirmDialog
  bind:open={rejectOpen}
  title="Tolak Deposit"
  message="Deposit akan ditandai Canceled."
>
  <form
    method="POST"
    action="?/reject"
    use:enhance={() => async (input: any) => {
      if (input.result.type === "failure")
        toast((input.result.data as any)?.error ?? "Gagal", "error");
      else toast((input.result.data as any)?.success ?? "OK", "success");
      rejectOpen = false;
      await applyAction(input.result);
    }}
  >
    <input type="hidden" name="id" value={rejectId ?? 0} />
    <div class="flex gap-2">
      <Button type="submit" variant="danger" class="flex-1">Ya, Tolak</Button>
      <Button type="button" variant="ghost" onclick={() => (rejectOpen = false)}>Batal</Button>
    </div>
  </form>
</ConfirmDialog>
