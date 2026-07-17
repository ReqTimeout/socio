<script lang="ts">
  import { enhance } from "$app/forms";
  import { Button } from "@socio/ui";
  import { renderTurnstile } from "$lib/turnstile";
  import { page } from "$app/stores";
  import { onMount } from "svelte";

  let { data, form } = $props<{ data: typeof data; form: import("./$types").ActionData }>();
  let loading = $state(false);
  let password = $state("");

  // zxcvbn loads dynamically (client only) to keep bundle small.
  let score = $state<number | null>(null);
  let crackTime = $state("");
  onMount(async () => {
    const { zxcvbn } = await import("@zxcvbn-ts/core");
    const common = (await import("@zxcvbn-ts/language-common")).default;
    const zxOpts = { dictionary: { ...common.dictionary } } as never;
    $effect(() => {
      if (!password) {
        score = null;
        return;
      }
      const r = zxcvbn(password, zxOpts);
      score = r.score;
      crackTime = r.crackTimesDisplay.offlineSlowHashing1e4PerSecond ?? "";
    });
  });

  const sitekey = $derived(data.turnstileSitekey);
  let turnstileEl = $state<HTMLElement | null>(null);
  let handle = $state<ReturnType<typeof renderTurnstile> | null>(null);
  $effect(() => {
    if (sitekey && turnstileEl) handle = renderTurnstile("turnstile-widget", sitekey, "signup");
  });

  const strength = ["Sangat lemah", "Lemah", "Sedang", "Kuat", "Sangat kuat"];
  const colors = ["bg-danger", "bg-danger", "bg-warning", "bg-success", "bg-success"];
</script>

<svelte:head>
  <title>Daftar — Socio.id</title>
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
      <p class="text-ink-500 mt-2 text-sm">Daftar reseller SMM gratis</p>
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
        <span class="text-sm font-semibold text-ink-700">Nama lengkap</span>
        <input
          name="fullName"
          value={form?.fullName ?? ""}
          required
          class="mt-1.5 w-full rounded-2xl border border-ink-200 px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus:border-primary"
          placeholder="Nama Anda"
        />
      </label>

      <label class="block">
        <span class="text-sm font-semibold text-ink-700">Username</span>
        <input
          name="username"
          value={form?.username ?? ""}
          required
          class="mt-1.5 w-full rounded-2xl border border-ink-200 px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus:border-primary"
          placeholder="username"
        />
      </label>

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
          bind:value={password}
          required
          autocomplete="new-password"
          class="mt-1.5 w-full rounded-2xl border border-ink-200 px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus:border-primary"
          placeholder="Minimal 8 karakter"
        />
        {#if score !== null}
          <div class="mt-2 flex items-center gap-2">
            <div class="flex-1 h-1.5 rounded-full bg-ink-100 overflow-hidden flex">
              {#each [0, 1, 2, 3] as i}
                <div
                  class="flex-1 mx-px rounded-full {i < (score ?? 0)
                    ? colors[score ?? 0]
                    : 'bg-transparent'}"
                ></div>
              {/each}
            </div>
            <span class="text-xs font-semibold {colors[score ?? 0].replace('bg-', 'text-')}"
              >{strength[score ?? 0]}</span
            >
          </div>
          {#if crackTime}
            <p class="text-[11px] text-ink-400 mt-1">Waktu tembus diperkirakan: {crackTime}</p>
          {/if}
        {/if}
      </label>

      {#if sitekey}
        <div id="turnstile-widget" bind:this={turnstileEl}></div>
      {/if}

      <Button type="submit" full disabled={loading}>
        {loading ? "Memproses…" : "Daftar"}
      </Button>
    </form>

    <div class="mt-6 text-center text-sm text-ink-500">
      <span
        >Sudah punya akun? <a
          href="/login"
          class="font-semibold text-primary hover:text-primary-700">Masuk</a
        ></span
      >
    </div>
  </div>
</div>
