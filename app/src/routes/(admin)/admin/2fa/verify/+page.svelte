<script lang="ts">
  import { enhance } from "$app/forms";
  import { Icon, Button } from "@socio/ui";
  import type { PageData, ActionData } from "./$types";

  let { data, form } = $props<{ data: PageData; form: ActionData }>();
  let code = $state("");
  let loading = $state(false);
</script>

<svelte:head>
  <title>Verifikasi 2FA — Socio Admin</title>
</svelte:head>

<div class="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center p-4">
  <div class="w-full rounded-2xl border border-ink-100 bg-surface p-6 shadow-sm">
    <div class="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-amber-100 text-amber-600">
      <Icon name="shield" size={24} />
    </div>
    <h1 class="mt-4 text-center font-display text-lg font-extrabold">Verifikasi 2FA</h1>
    <p class="mt-1 text-center text-sm text-ink-500">Masukin 6 digit dari Authenticator untuk @{data.username}</p>

    {#if form?.error}
      <div class="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger" role="alert">{form.error}</div>
    {/if}

    <form
      method="POST"
      use:enhance={() => {
        loading = true;
        return async ({ update }) => {
          await update();
          loading = false;
        };
      }}
      class="mt-6 space-y-4"
    >
      <input
        name="code"
        bind:value={code}
        inputmode="numeric"
        autocomplete="one-time-code"
        placeholder="123456"
        maxlength="12"
        required
        class="h-12 w-full rounded-xl border border-ink-200 bg-white px-4 text-center font-mono text-xl tracking-[0.3em] outline-none focus:border-primary"
      />
      <Button type="submit" full disabled={loading}>
        {#if loading}Memverifikasi…{:else}Verifikasi{/if}
      </Button>
      <p class="text-center text-xs text-ink-400">Kehilangan HP? Pakai salah satu backup code (format: XXXXX-XXXXX).</p>
    </form>
  </div>
</div>
