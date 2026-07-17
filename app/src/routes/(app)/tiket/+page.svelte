<script lang="ts">
  import { Input, Button, EmptyState, toast } from "@socio/ui";
  import { haptic } from "@socio/ui";
  import { applyAction, enhance } from "$app/forms";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let subject = $state("");
  let message = $state("");
  let sending = $state(false);
</script>

<section class="space-y-4">
  <h1 class="font-display text-lg font-bold">Tiket Bantuan</h1>

  {#if data.tickets.length === 0}
    <EmptyState title="Belum ada tiket" description="Buat tiket jika ada kendala." />
  {:else}
    <ul class="space-y-2">
      {#each data.tickets as t (t.ticket_id)}
        <li class="rounded-2xl border border-ink-100 bg-surface p-4">
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold">{t.subject}</span>
            <span class="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-600">{t.status}</span>
          </div>
          <p class="mt-1 text-xs text-ink-500">{t.msgs} pesan · {new Date(t.last).toLocaleDateString("id-ID")}</p>
        </li>
      {/each}
    </ul>
  {/if}

  {#if form?.error}
    <div class="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{form.error}</div>
  {/if}

  <form
    method="POST"
    action="?/create"
    class="space-y-3 rounded-2xl border border-ink-100 bg-surface p-4"
    use:enhance={() => { sending = true; return async ({ result }) => { sending = false; if (result.type === "failure") toast((result.data as any)?.error ?? "Gagal", "error"); else { subject = ""; message = ""; toast("Tiket dikirim", "success"); await applyAction(result); } }; }}
  >
    <h2 class="text-sm font-semibold">Buat Tiket Baru</h2>
    <Input name="subject" bind:value={subject} placeholder="Subjek" required />
    <textarea name="message" bind:value={message} placeholder="Pesan…" rows="3" class="w-full rounded-xl border border-ink-200 bg-surface px-3 py-2 text-sm outline-none focus:border-accent-ink" required></textarea>
    <Button type="submit" disabled={sending} class="w-full">{sending ? "Mengirim…" : "Kirim Tiket"}</Button>
  </form>
</section>
