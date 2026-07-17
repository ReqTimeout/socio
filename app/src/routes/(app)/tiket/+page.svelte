<script lang="ts">
  import { Input, Button, EmptyState, toast } from "@socio/ui";
  import { haptic } from "@socio/ui";
  import { applyAction, enhance } from "$app/forms";
  import { goto } from "$app/navigation";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let subject = $state("");
  let message = $state("");
  let reply = $state("");
  let sending = $state(false);
  let sendingReply = $state(false);

  function openTicket(id: number) {
    haptic();
    goto(`/tiket?ticket=${id}`, { keepFocus: true, noScroll: true });
  }
  function back() {
    haptic();
    goto("/tiket", { noScroll: true });
  }
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
  {#if data.activeId}
    <!-- Detail -->
    <button onclick={back} class="flex items-center gap-1 text-sm font-semibold text-ink-500">
      <span>‹</span> Kembali
    </button>
    <h1 class="font-display text-lg font-bold">
      {data.messages[0]?.type === "user" ? data.messages[0].message.slice(0, 40) : "Tiket"}
    </h1>

    <div class="space-y-2">
      {#each data.messages as m (m.id)}
        <div
          class="rounded-2xl border border-ink-100 bg-surface p-3 {m.type === 'admin'
            ? 'border-accent-ink/30 bg-accent-ink/5'
            : ''}"
        >
          <div class="mb-1 flex items-center justify-between">
            <span
              class="text-xs font-semibold {m.type === 'admin'
                ? 'text-accent-ink'
                : 'text-ink-500'}">{m.type === "admin" ? "Admin" : "Anda"}</span
            >
            <span class="text-xs text-ink-400">{timeAgo(m.created_at)}</span>
          </div>
          <p class="text-sm">{m.message}</p>
        </div>
      {/each}
    </div>

    {#if data.messages[0]?.status !== "Closed"}
      <form
        method="POST"
        action="?/reply"
        class="space-y-2 rounded-2xl border border-ink-100 bg-surface p-3"
      >
        <input type="hidden" name="ticketId" value={data.activeId} />
        <textarea
          name="message"
          bind:value={reply}
          rows="2"
          placeholder="Balas…"
          class="w-full rounded-xl border border-ink-200 bg-surface px-3 py-2 text-sm outline-none focus:border-accent-ink"
        ></textarea>
        <div class="flex gap-2">
          <Button
            type="submit"
            size="sm"
            disabled={sendingReply}
            onclick={() => (sendingReply = true)}>Kirim</Button
          >
          <Button
            type="submit"
            formaction="?/close"
            size="sm"
            variant="ghost"
            onclick={() => (sendingReply = true)}>Tutup Tiket</Button
          >
        </div>
      </form>
    {:else}
      <div class="rounded-xl bg-ink-100 px-3 py-2 text-center text-sm font-medium text-ink-500">
        Tiket ditutup
      </div>
    {/if}
  {:else}
    <!-- List -->
    <h1 class="font-display text-lg font-bold">Tiket Bantuan</h1>

    {#if data.tickets.length === 0}
      <EmptyState title="Belum ada tiket" description="Buat tiket jika ada kendala." />
    {:else}
      <ul class="space-y-2">
        {#each data.tickets as t (t.ticket_id)}
          <li>
            <button
              onclick={() => openTicket(t.ticket_id)}
              class="w-full rounded-2xl border border-ink-100 bg-surface p-4 text-left hover:border-ink-200"
            >
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold">{t.subject}</span>
                <span class="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-medium text-ink-600"
                  >{t.status}</span
                >
              </div>
              <p class="mt-1 text-xs text-ink-500">
                {t.msgs} pesan · {new Date(t.last).toLocaleDateString("id-ID")}
              </p>
            </button>
          </li>
        {/each}
      </ul>
    {/if}

    {#if form?.error}
      <div class="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">
        {form.error}
      </div>
    {/if}

    <form
      method="POST"
      action="?/create"
      class="space-y-3 rounded-2xl border border-ink-100 bg-surface p-4"
      use:enhance={() => {
        sending = true;
        return async ({ result }) => {
          sending = false;
          if (result.type === "failure") toast((result.data as any)?.error ?? "Gagal", "error");
          else {
            subject = "";
            message = "";
            toast("Tiket dikirim", "success");
            await applyAction(result);
          }
        };
      }}
    >
      <h2 class="text-sm font-semibold">Buat Tiket Baru</h2>
      <Input name="subject" bind:value={subject} placeholder="Subjek" required />
      <textarea
        name="message"
        bind:value={message}
        placeholder="Pesan…"
        rows="3"
        class="w-full rounded-xl border border-ink-200 bg-surface px-3 py-2 text-sm outline-none focus:border-accent-ink"
        required
      ></textarea>
      <Button type="submit" disabled={sending} class="w-full"
        >{sending ? "Mengirim…" : "Kirim Tiket"}</Button
      >
    </form>
  {/if}
</section>
