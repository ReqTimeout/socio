<script lang="ts">
  import { enhance } from "$app/forms";
  import { AuthBackdrop, Button, Icon } from "@socio/ui";
  import { renderTurnstile } from "$lib/turnstile";
  import { onMount } from "svelte";

  let { data, form } = $props<{ data: typeof data; form: import("./$types").ActionData }>();
  let loading = $state(false);
  let password = $state("");
  let showPassword = $state(false);
  let capsLockOn = $state(false);
  let mode = $state<"member" | "reseller">("member");

  function checkCapsLock(e: KeyboardEvent) {
    capsLockOn = e.getModifierState?.("CapsLock") ?? false;
  }

  // zxcvbn loads dynamically (client only) to keep bundle small.
  let score = $state<number | null>(null);
  let crackTime = $state("");
  let zxcvbnFn = $state<
    | ((
        pw: string,
        opts?: never,
      ) => { score: number; crackTimesDisplay: { offlineSlowHashing1e4PerSecond?: string } })
    | null
  >(null);
  let zxOpts = $state<never | null>(null);
  onMount(async () => {
    const { zxcvbn } = await import("@zxcvbn-ts/core");
    const common = (await import("@zxcvbn-ts/language-common")).default;
    zxOpts = { dictionary: { ...common.dictionary } } as never;
    zxcvbnFn = zxcvbn;
  });

  $effect(() => {
    if (!password || !zxcvbnFn || !zxOpts) {
      score = null;
      return;
    }
    const r = zxcvbnFn(password, zxOpts);
    score = r.score;
    crackTime = r.crackTimesDisplay.offlineSlowHashing1e4PerSecond ?? "";
  });

  const sitekey = $derived(data.turnstileSitekey);
  let turnstileEl = $state<HTMLElement | null>(null);
  $effect(() => {
    if (sitekey && turnstileEl) renderTurnstile("turnstile-widget", sitekey, "signup");
  });

  const strength = ["Sangat lemah", "Lemah", "Sedang", "Kuat", "Sangat kuat"];
  const colors = ["bg-danger", "bg-danger", "bg-warning", "bg-success", "bg-success"];

  function pickMode(m: "member" | "reseller") {
    if (mode !== m) {
      mode = m;
      navigator.vibrate?.(8);
    }
  }
</script>

<svelte:head>
  <title>Daftar — Socio.id</title>
  <meta
    name="description"
    content="Daftar gratis di Socio.id atau upgrade ke akun Reseller untuk harga grosir layanan SMM."
  />
</svelte:head>

<div
  class="relative min-h-screen bg-ink-50 flex flex-col px-5 py-8 overflow-hidden"
  style="padding-top: max(2rem, env(safe-area-inset-top));"
>
  <AuthBackdrop playful variant={mode === "reseller" ? "reseller" : "member"} />
  <div class="relative z-10 flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
    <div class="mb-6 text-center animate-[authIn_420ms_var(--ease-out-soft)]">
      <div class="font-display font-extrabold text-3xl text-primary tracking-tight">
        socio<span class="text-accent-700">.id</span>
      </div>
      <p class="text-sm text-ink-500 mt-2">Panel SMM terbesar &amp; termurah se-Indonesia</p>
    </div>

    {#if data.referrer}
      <div
        class="mb-4 flex items-center gap-2 rounded-2xl bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary-700"
      >
        <Icon name="gift" size={16} />
        Diundang oleh <b>@{data.referrer.username}</b>
      </div>
    {/if}

    {#if form?.error}
      <div
        class="mb-4 rounded-2xl bg-danger-soft text-danger text-sm px-4 py-3 font-medium flex items-start gap-2.5"
        role="alert"
      >
        <span class="error-shake shrink-0 mt-px"><Icon name="alert" size={17} stroke={2} /></span>
        {form.error}
      </div>
    {/if}

    <!-- Segment mode: Member / Reseller -->
    <div class="relative mb-4 grid grid-cols-2 rounded-2xl bg-ink-100 p-1" role="tablist">
      <div
        class="absolute inset-y-1 w-[calc(50%-4px)] rounded-xl bg-white shadow-sm transition-transform duration-200 ease-out"
        style="transform: translateX({mode === 'member' ? '0%' : '100%'});"
        aria-hidden="true"
      ></div>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "member"}
        onclick={() => pickMode("member")}
        class="relative z-10 rounded-xl py-2.5 text-sm font-bold transition-colors duration-200
          {mode === 'member' ? 'text-ink-900' : 'text-ink-500'}"
      >
        Akun Gratis
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === "reseller"}
        onclick={() => pickMode("reseller")}
        class="relative z-10 rounded-xl py-2.5 text-sm font-bold transition-colors duration-200
          {mode === 'reseller' ? 'text-ink-900' : 'text-ink-500'}"
      >
        Jadi Reseller
      </button>
    </div>

    {#if mode === "reseller"}
      <div class="mb-4 grid grid-cols-1 gap-2">
        <div class="flex items-start gap-2.5 rounded-2xl border border-ink-100 bg-white px-4 py-3">
          <Icon name="tag" size={16} class="mt-0.5 shrink-0 text-primary" />
          <p class="text-xs leading-relaxed text-ink-600">
            Harga grosir khusus reseller, cocok untuk jualan ulang &amp; produksi harian.
          </p>
        </div>
        <div class="flex items-start gap-2.5 rounded-2xl border border-ink-100 bg-white px-4 py-3">
          <Icon name="zap" size={16} class="mt-0.5 shrink-0 text-primary" />
          <p class="text-xs leading-relaxed text-ink-600">
            Aktivasi Rp50.000 via transfer BCA — <b>saldo Rp20.000 sudah termasuk</b> &amp; langsung bisa
            dipakai pesan.
          </p>
        </div>
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
      <input type="hidden" name="mode" value={mode} />

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
        <span class="text-sm font-semibold text-ink-700">Nomor WhatsApp</span>
        <input
          name="whatsapp"
          inputmode="numeric"
          class="mt-1.5 w-full rounded-2xl border border-ink-200 px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus:border-primary"
          placeholder="628123456789"
          required={mode === "reseller"}
        />
      </label>

      <label class="block">
        <span class="text-sm font-semibold text-ink-700">Password</span>
        <div class="relative mt-1.5">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            bind:value={password}
            required
            autocomplete="new-password"
            onkeydown={checkCapsLock}
            onkeyup={checkCapsLock}
            class="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 pr-12 text-sm transition-colors duration-200
              {password !== '' && (score ?? 0) >= 3 ? 'border-success/60' : ''}
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus:border-primary"
            placeholder="Minimal 8 karakter"
          />
          <button
            type="button"
            onclick={() => (showPassword = !showPassword)}
            aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
            aria-pressed={showPassword}
            class="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-ink-500
              transition-colors duration-200 hover:text-ink-700 focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <span class="icon-swap" aria-hidden="true">
              {#if showPassword}
                <Icon name="eye_off" size={18} />
              {:else}
                <Icon name="eye" size={18} />
              {/if}
            </span>
          </button>
        </div>
        {#if capsLockOn}
          <p
            class="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-warning animate-[hintIn_180ms_var(--ease-out-quad)_both]"
          >
            <Icon name="alert" size={13} stroke={2} /> Caps Lock aktif
          </p>
        {/if}
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
            <p class="text-[11px] text-ink-500 mt-1">Waktu tembus diperkirakan: {crackTime}</p>
          {/if}
        {/if}
      </label>

      {#if sitekey}
        <div id="turnstile-widget" bind:this={turnstileEl}></div>
      {/if}

      <Button type="submit" full disabled={loading}>
        {#if loading}
          <Icon name="refresh" size={15} class="animate-spin" /> Memproses…
        {:else if mode === "reseller"}
          Daftar Reseller
        {:else}
          Daftar
        {/if}
      </Button>

      {#if mode === "reseller"}
        <p class="text-center text-[11px] leading-relaxed text-ink-500">
          Setelah daftar, cek email untuk instruksi pembayaran aktivasi. Akun aktif otomatis begitu
          pembayaran kami terima.
        </p>
      {/if}
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

<style>
  @keyframes authIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes hintIn {
    from {
      opacity: 0;
      transform: translateY(-2px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes shake {
    0%,
    100% {
      transform: translateX(0);
    }
    20% {
      transform: translateX(-5px);
    }
    40% {
      transform: translateX(4px);
    }
    60% {
      transform: translateX(-3px);
    }
    80% {
      transform: translateX(2px);
    }
  }
  .error-shake {
    display: inline-block;
    animation: shake 340ms cubic-bezier(0.36, 0.07, 0.19, 0.97) 60ms;
  }

  .icon-swap {
    display: inline-flex;
    transition: transform 180ms var(--ease-out-quad);
  }
  .icon-swap:active {
    transform: scale(0.85);
  }

  @media (prefers-reduced-motion: reduce) {
    .icon-swap {
      transition: none !important;
    }
    .icon-swap:active {
      transform: none;
    }
  }
</style>
