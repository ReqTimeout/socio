<script lang="ts">
  import { enhance } from "$app/forms";
  import { Button } from "@socio/ui";
  import { renderTurnstile } from "$lib/turnstile";
  import type { ActionData } from "./$types";

  let { data, form } = $props<{ data: typeof data; form: ActionData }>();
  let loading = $state(false);

  const sitekey = $derived(data.turnstileSitekey);
  let turnstileEl = $state<HTMLElement | null>(null);
  let handle = $state<ReturnType<typeof renderTurnstile> | null>(null);

  $effect(() => {
    if (sitekey && turnstileEl) {
      handle = renderTurnstile("turnstile-widget", sitekey, "login");
    }
  });
</script>

<svelte:head>
  <title>Masuk — Socio.id</title>
</svelte:head>

<div
  class="min-h-screen bg-ink-50 flex flex-col px-5 py-8"
  style="padding-top: max(2rem, env(safe-area-inset-top));"
>
  <div class="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
    <div class="mb-8 text-center">
      <div class="font-display font-extrabold text-3xl text-primary tracking-tight">
        socio<span class="text-accent-500">.id</span>
      </div>
      <p class="text-ink-500 mt-2 text-sm">Masuk ke panel SMM reseller Anda</p>
    </div>

    {#if form?.error}
      <div
        class="mb-4 rounded-2xl bg-danger-soft text-danger text-sm px-4 py-3 font-medium"
        role="alert"
      >
        {form.error}
      </div>
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
      class="bg-white rounded-card shadow-card border border-ink-100 p-6 space-y-4"
    >
      <label class="block">
        <span class="text-sm font-semibold text-ink-700">Email</span>
        <input
          type="email"
          name="email"
          value={form?.email ?? ""}
          required
          autocomplete="email"
          class="mt-1.5 w-full rounded-2xl border border-ink-200 px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus:border-primary"
          placeholder="you@example.com"
        />
      </label>

      <label class="block">
        <span class="text-sm font-semibold text-ink-700">Password</span>
        <input
          type="password"
          name="password"
          required
          autocomplete="current-password"
          class="mt-1.5 w-full rounded-2xl border border-ink-200 px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus:border-primary"
          placeholder="••••••••"
        />
      </label>

      {#if sitekey}
        <div id="turnstile-widget" bind:this={turnstileEl}></div>
      {/if}

      <Button type="submit" full disabled={loading}>
        {loading ? "Memproses…" : "Masuk"}
      </Button>
    </form>

    <div class="mt-6 text-center text-sm text-ink-500 space-y-2">
      <a href="/lupa-password" class="block font-medium text-primary hover:text-primary-700"
        >Lupa password?</a
      >
      <span
        >Belum punya akun? <a
          href="/daftar"
          class="font-semibold text-primary hover:text-primary-700">Daftar gratis</a
        ></span
      >
    </div>
  </div>
</div>
