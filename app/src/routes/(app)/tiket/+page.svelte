<script lang="ts">
  import { Input, Button, toast, revealDelay, hoverLift, EmptyTicketsArt } from "@socio/ui";
  import { haptic } from "@socio/ui";
  import { copy } from "@socio/core/copy";
  import { applyAction, enhance } from "$app/forms";
  import { goto } from "$app/navigation";
  import { formatDateShort } from "$lib/format";
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
    const date = new Date(d);
    const time = new Intl.DateTimeFormat("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
    return `${formatDateShort(date)}, ${time}`;
  }
</script>

<svelte:head>
  <title>Tiket Bantuan — Socio.id | Panel SMM Indonesia</title>
  <meta
    name="description"
    content="Dapatkan bantuan dari tim support Socio.id. Buat tiket untuk masalah order, pembayaran, atau akun."
  />
</svelte:head>

<section class="space-y-4 lg:space-y-5">
  {#if data.activeId}
    <!-- Detail -->
    <button
      onclick={back}
      class="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-surface px-3 py-1.5 text-sm font-semibold text-ink-600 transition hover:bg-ink-50 hover:text-ink-800"
    >
      <span aria-hidden="true">‹</span> Kembali ke daftar
    </button>
    <div class="rounded-2xl border border-ink-100 bg-surface p-4 shadow-sm lg:p-5">
      <h1 class="font-display text-base font-bold lg:text-lg">
        {data.messages[0]?.type === "user"
          ? data.messages[0].message.slice(0, 48)
          : "Tiket #" + data.activeId}
      </h1>
      <p class="mt-1 flex items-center gap-1.5 text-xs text-ink-500">
        {data.messages.length} pesan · {copy.ticket.replyEstimate}
      </p>
    </div>

    <div class="space-y-3">
      {#each data.messages as m, i (m.id)}
        <div
          class="rounded-2xl border p-4 reveal {m.type === 'admin'
            ? 'border-amber-200 bg-amber-50 shadow-[0_4px_16px_-10px_rgba(245,158,11,0.25)]'
            : 'surface-pop border-ink-100 bg-surface'}"
          style={revealDelay(i, 0, 45)}
        >
          <div class="mb-1.5 flex items-center justify-between">
            <span
              class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold {m.type ===
              'admin'
                ? 'bg-amber-500 text-white'
                : 'bg-ink-900 text-white'}"
            >
              <span
                class="h-1.5 w-1.5 rounded-full {m.type === 'admin' ? 'bg-white' : 'bg-white/70'}"
              ></span>
              {m.type === "admin" ? "Tim Socio.id" : "Anda"}
            </span>
            <span class="text-xs text-ink-500">{timeAgo(m.created_at)}</span>
          </div>
          <p class="whitespace-pre-wrap text-sm leading-relaxed text-ink-800">{m.message}</p>
        </div>
      {/each}
    </div>

    {#if data.messages[0]?.status !== "Closed"}
      <form
        method="POST"
        action="?/reply"
        class="surface-pop space-y-3 rounded-2xl border border-ink-100 bg-surface p-4"
        use:enhance={() => {
          sendingReply = true;
          return async ({ result }) => {
            sendingReply = false;
            if (result.type === "failure") toast((result.data as any)?.error ?? "Gagal", "error");
            else {
              reply = "";
              toast("Balasan terkirim", "success");
              await applyAction(result);
            }
          };
        }}
      >
        <input type="hidden" name="ticketId" value={data.activeId} />
        <textarea
          name="message"
          bind:value={reply}
          rows="3"
          placeholder="Tulis balasan…"
          class="w-full rounded-xl border border-ink-200 bg-surface px-3 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
          required
        ></textarea>
        <div class="flex gap-2">
          <Button type="submit" size="sm" disabled={sendingReply}>
            {sendingReply ? "Mengirim…" : "Kirim balasan"}
          </Button>
          <Button
            type="submit"
            formaction="?/close"
            size="sm"
            variant="ghost"
            disabled={sendingReply}
          >
            Tutup Tiket
          </Button>
        </div>
      </form>
    {:else}
      <div
        class="rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 text-center text-sm font-medium text-ink-500"
      >
        Tiket sudah ditutup — buat tiket baru jika masih butuh bantuan.
      </div>
    {/if}
  {:else}
    <!-- Header -->
    <div class="space-y-1">
      <h1
        class="reveal font-display text-xl font-extrabold tracking-tight lg:text-[1.7rem]"
        style="--d:0ms"
      >
        Tiket Bantuan
      </h1>
      <p class="reveal text-sm text-ink-500 lg:text-[14px]" style="--d:40ms">
        Butuh bantuan order, saldo, atau akun? {copy.ticket.replyEstimate}
      </p>
    </div>

    <!-- Stats hint -->
    {#if data.tickets.length > 0}
      <div class="reveal flex items-center gap-2 text-xs" style="--d:80ms">
        <span
          class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-bold text-primary"
        >
          {data.tickets.length} tiket
        </span>
        <span class="text-ink-500">· tap kartu untuk buka percakapan</span>
      </div>
    {/if}

    {#if data.tickets.length === 0}
      <div
        class="reveal relative overflow-hidden rounded-2xl border border-dashed border-ink-200 bg-surface p-8 text-center lg:p-10"
        style="--d:80ms"
      >
        <div
          class="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 opacity-10 blur-2xl"
        ></div>
        <EmptyTicketsArt size={112} class="relative mx-auto mb-3 text-ink-300" />
        <p class="relative text-sm font-bold text-ink-800">{copy.empty.tickets.title}</p>
        <p class="relative mt-1 text-xs leading-relaxed text-ink-500">{copy.empty.tickets.desc}</p>
      </div>
    {:else}
      <ul class="grid gap-3 lg:grid-cols-2">
        {#each data.tickets as t, i (t.ticket_id)}
          <li class="reveal" style={revealDelay(i, 0, 40)}>
            <button
              onclick={() => openTicket(t.ticket_id)}
              class="group flex w-full items-center gap-3 rounded-2xl border border-ink-100 bg-surface p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_10px_28px_-10px_rgba(15,23,42,0.14)] lg:p-5 {hoverLift}"
            >
              <span
                class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-primary-600 text-white shadow-sm"
              >
                {t.subject.slice(0, 1).toUpperCase()}
              </span>
              <span class="min-w-0 flex-1">
                <span
                  class="block truncate text-sm font-bold group-hover:text-primary transition-colors"
                  >{t.subject}</span
                >
                <span class="mt-0.5 block truncate text-xs text-ink-500"
                  >{t.msgs} pesan · {formatDateShort(t.last)}</span
                >
              </span>
              <span
                class="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold {t.status === 'Closed'
                  ? 'bg-ink-100 text-ink-500'
                  : t.status === 'Answered'
                    ? 'bg-success/10 text-success'
                    : 'bg-amber-100 text-amber-700'}">{t.status}</span
              >
            </button>
          </li>
        {/each}
      </ul>
    {/if}

    {#if form?.error}
      <div class="rounded-xl bg-danger/10 px-3 py-2.5 text-sm font-medium text-danger">
        {form.error}
      </div>
    {/if}

    <!-- Buat Tiket Baru — card premium -->
    <form
      method="POST"
      action="?/create"
      class="reveal surface-pop space-y-4 rounded-2xl border border-ink-100 bg-surface p-4 lg:p-5"
      style="--d:120ms"
      use:enhance={() => {
        sending = true;
        return async ({ result }) => {
          sending = false;
          if (result.type === "failure") toast((result.data as any)?.error ?? "Gagal", "error");
          else {
            subject = "";
            message = "";
            toast("Tiket terkirim — tim kami akan balas segera", "success");
            await applyAction(result);
          }
        };
      }}
    >
      <div>
        <h2 class="font-display text-sm font-extrabold">Buat Tiket Baru</h2>
        <p class="mt-0.5 text-xs text-ink-500">
          Jelaskan kendala sejelas mungkin biar cepat dibantu.
        </p>
      </div>
      <Input
        name="subject"
        bind:value={subject}
        placeholder="Subjek — mis. Pesanan #123 belum masuk"
        required
      />
      <textarea
        name="message"
        bind:value={message}
        placeholder="Ceritakan detailnya…"
        rows="4"
        class="w-full rounded-xl border border-ink-200 bg-surface px-3 py-2.5 text-sm outline-none transition placeholder:text-ink-500 focus:border-primary focus:ring-2 focus:ring-primary/10"
        required
      ></textarea>
      <Button type="submit" disabled={sending} full>
        {#if sending}Mengirim…{:else}{copy.ticket.cta}{/if}
      </Button>
    </form>
  {/if}
</section>
