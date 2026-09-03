<script lang="ts">
  import { enhance } from "$app/forms";
  import { AuthBackdrop, Button, Icon } from "@socio/ui";
  import { renderTurnstile } from "$lib/turnstile";
  import type { ActionData } from "./$types";

  let { data, form } = $props<{ data: typeof data; form: ActionData }>();
  let loading = $state(false);
  let showPassword = $state(false);
  let capsLockOn = $state(false);
  let emailValid = $state(false);
  let emailFocused = $state(false);

  const sitekey = $derived(data.turnstileSitekey);
  let turnstileEl = $state<HTMLElement | null>(null);
  let turnstileHandle: ReturnType<typeof renderTurnstile> | null = null;

  $effect(() => {
    if (sitekey && turnstileEl) {
      turnstileHandle = renderTurnstile("turnstile-widget", sitekey, "login");
    }
  });

  // After a failed submit the form action re-renders with `form` populated.
  // Turnstile tokens are single-use — reset the widget so the next attempt
  // gets a fresh token (otherwise every retry sends the consumed token).
  $effect(() => {
    if (form?.error && turnstileHandle) {
      turnstileHandle.reset();
    }
  });

  function onEmailInput(e: Event) {
    const el = e.currentTarget as HTMLInputElement;
    emailValid = el.value !== "" && el.checkValidity();
  }

  function checkCapsLock(e: KeyboardEvent) {
    capsLockOn = e.getModifierState?.("CapsLock") ?? false;
  }

  function togglePassword() {
    showPassword = !showPassword;
    navigator.vibrate?.(5);
  }
</script>

<svelte:head>
  <title>Masuk — Socio.id</title>
</svelte:head>

<div
  class="relative min-h-screen bg-ink-50 flex flex-col px-5 py-8 overflow-hidden"
  style="padding-top: max(2rem, env(safe-area-inset-top));"
>
  <AuthBackdrop variant="default" />
  <div class="relative z-10 flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
    <!-- Logo + tagline (staggered entrance) -->
    <div class="mb-8 text-center">
      <div
        class="font-display font-extrabold text-3xl text-primary tracking-tight animate-[authIn_420ms_var(--ease-out-soft)_both]"
      >
        socio<span class="text-accent-700">.id</span>
      </div>
      <p class="text-ink-500 mt-3 text-sm animate-[authIn_420ms_var(--ease-out-soft)_60ms_both]">
        Masuk ke panel SMM reseller Anda
      </p>
    </div>

    {#if form?.error}
      <div
        class="mb-4 rounded-2xl bg-danger-soft text-danger text-sm px-4 py-3 font-medium flex items-start gap-2.5"
        role="alert"
      >
        <span class="error-shake shrink-0 mt-px"><Icon name="alert" size={17} stroke={2} /></span>
        <div class="flex-1 animate-[authIn_300ms_var(--ease-out-soft)_both]">
          {form.error}
          {#if form?.unverified}
            <a
              href={`/verifikasi?email=${encodeURIComponent(form?.email ?? "")}`}
              class="mt-2 inline-block font-bold text-primary hover:text-primary-700"
            >
              Kirim ulang link verifikasi →
            </a>
          {/if}
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
      class="bg-white rounded-card shadow-card border border-ink-100 p-6 space-y-4 {form?.error
        ? 'form-shake'
        : ''}"
    >
      <label class="block">
        <span class="text-sm font-semibold text-ink-700">Email</span>
        <div class="relative mt-1.5">
          <input
            type="email"
            name="email"
            value={form?.email ?? ""}
            required
            autocomplete="email"
            oninput={onEmailInput}
            onfocus={() => (emailFocused = true)}
            onblur={() => (emailFocused = false)}
            class="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 pr-11 text-sm transition-colors duration-200
              {emailValid ? 'border-success/60' : emailFocused ? 'border-primary' : ''}
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            placeholder="you@example.com"
          />
          <!-- validity tick (pop micro-interaction) -->
          {#if emailValid}
            <span
              class="absolute right-3 top-1/2 -translate-y-1/2 text-success animate-[tickPop_280ms_var(--ease-out-soft)_both]"
              aria-hidden="true"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.12" />
                <path
                  d="M8 12.5l2.6 2.6L16 9.8"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
          {/if}
        </div>
      </label>

      <label class="block">
        <span class="text-sm font-semibold text-ink-700">Password</span>
        <div class="relative mt-1.5">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            required
            autocomplete="current-password"
            onkeydown={checkCapsLock}
            onkeyup={checkCapsLock}
            class="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 pr-12 text-sm transition-colors duration-200
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus:border-primary"
            placeholder="••••••••"
          />
          <!-- show/hide toggle -->
          <button
            type="button"
            onclick={togglePassword}
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
        <!-- caps-lock hint -->
        {#if capsLockOn}
          <p
            class="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-warning animate-[hintIn_180ms_var(--ease-out-quad)_both]"
          >
            <Icon name="alert" size={13} stroke={2} /> Caps Lock aktif
          </p>
        {/if}
      </label>

      {#if sitekey}
        <div id="turnstile-widget" bind:this={turnstileEl}></div>
      {/if}

      <Button type="submit" full disabled={loading}>
        {#if loading}
          <Icon name="refresh" size={15} class="animate-spin" /> Memproses…
        {:else}
          Masuk <span class="btn-arrow"><Icon name="arrow_right" size={15} /></span>
        {/if}
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

  /* Error feedback — tiny shake, instantly communicates "wrong" (reduced-motion safe) */
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
  .form-shake {
    animation: shake 340ms cubic-bezier(0.36, 0.07, 0.19, 0.97);
  }
  .error-shake {
    display: inline-block;
    animation: shake 340ms cubic-bezier(0.36, 0.07, 0.19, 0.97) 60ms;
  }

  /* Validity tick — small pop (transform+opacity only) */
  @keyframes tickPop {
    from {
      opacity: 0;
      transform: translateY(-50%) scale(0.5);
    }
    to {
      opacity: 1;
      transform: translateY(-50%) scale(1);
    }
  }

  /* Caps-lock hint */
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

  /* Eye icon tactile press (transform only) */
  .icon-swap {
    display: inline-flex;
    transition: transform 180ms var(--ease-out-quad);
  }
  .icon-swap:active {
    transform: scale(0.85);
  }

  /* Button arrow nudge on hover (paired with Button's own transition) */
  .btn-arrow {
    transition: transform 200ms var(--ease-out-quad);
  }
  form:has(button[type="submit"]:hover:not(:disabled)) .btn-arrow {
    transform: translateX(2px);
  }

  @media (prefers-reduced-motion: reduce) {
    .form-shake,
    .error-shake {
      animation: none !important;
    }
    .icon-swap,
    .btn-arrow {
      transition: none !important;
    }
    form:has(button[type="submit"]:hover:not(:disabled)) .btn-arrow {
      transform: none;
    }
    .icon-swap:active {
      transform: none;
    }
  }
</style>
