<script lang="ts">
  import { enhance } from "$app/forms";
  import { Button, Card, Sparko } from "@socio/ui";
  import type { PageData, ActionData } from "./$types";

  let { data, form } = $props<{ data: PageData; form: ActionData }>();

  let done = $derived(form?.ok === true);
</script>

<div class="flex min-h-dvh items-center justify-center px-4 py-10">
  <div class="w-full max-w-md">
    <Card padded={false}>
    <div class="flex flex-col items-center gap-4 p-6 text-center">
      <Sparko pose={done ? "celebrate" : "wave"} size={96} label={done ? "Selesai" : "Sparko"} />

      {#if done}
        <h1 class="font-display text-xl font-extrabold text-ink-900">Beres, kamu sudah berhenti berlangganan</h1>
        <p class="text-sm leading-relaxed text-ink-500">
          Email promosi dari Socio.id tidak akan terkirim lagi ke
          <span class="font-semibold text-ink-700">{data.display}</span>. Email penting seperti
          notifikasi pesanan, deposit, dan reset password tetap jalan.
        </p>
      {:else}
        <h1 class="font-display text-xl font-extrabold text-ink-900">Berhenti berlangganan email promosi?</h1>
        <p class="text-sm leading-relaxed text-ink-500">
          Kami akan menghentikan email penawaran/promosi ke
          <span class="font-semibold text-ink-700">{data.display}</span>. Kamu masih akan menerima
          email transaksi yang berkaitan dengan akun dan pesananmu.
        </p>
        <form
          method="POST"
          use:enhance
          class="mt-2 w-full"
        >
          <input type="hidden" name="confirm" value="yes" />
          <Button type="submit" variant="primary" class="w-full">
            Ya, berhenti berlangganan
          </Button>
        </form>
      {/if}

      <a href="/" class="text-xs font-medium text-ink-400 hover:text-ink-600">← Kembali ke Socio.id</a>
    </div>
    </Card>
  </div>
</div>
