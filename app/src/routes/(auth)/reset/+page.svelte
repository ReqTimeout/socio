<script lang="ts">
  import { enhance } from "$app/forms";
  import { AuthBackdrop, Button, Icon } from "@socio/ui";

  let { data, form } = $props<{ data: typeof data; form: import("./$types").ActionData }>();
  let loading = $state(false);
  let password = $state("");
  let confirm = $state("");
  let showPassword = $state(false);
  let capsLockOn = $state(false);

  const match = $derived(password !== "" && password === confirm);
  const longEnough = $derived(password.length >= 8);
  const canSubmit = $derived(longEnough && match);

  function checkCapsLock(e: KeyboardEvent) {
    capsLockOn = e.getModifierState?.("CapsLock") ?? false;
  }
</script>

<svelte:head><title>Reset password — Socio.id</title></svelte:head>

<div
  class="relative min-h-screen bg-ink-50 flex flex-col px-5 py-8 overflow-hidden"
  style="padding-top: max(2rem, env(safe-area-inset-top));"
>
  <AuthBackdrop variant="default" />
  <div class="relative z-10 flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
    <div class="mb-8 text-center">
      <div
        class="font-display font-extrabold text-3xl text-primary tracking-tight animate-[authIn_420ms_var(--ease-out-soft)_both]"
      >
        socio<span class="text-accent-700">.id</span>
      </div>
      <p class="text-ink-500 mt-3 text-sm animate-[authIn_420ms_var(--ease-out-soft)_60ms_both]">
        Buat password baru
      </p>
    </div>

    {#if form?.error}
      <div
        class="mb-4 rounded-2xl bg-danger-soft text-danger text-sm px-4 py-3 font-medium flex items-start gap-2.5 form-shake"
        role="alert"
      >
        <span class="error-shake shrink-0 mt-px"><Icon name="alert" size={17} stroke={2} /></span>
        {form?.error}
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
      <input type="hidden" name="token" value={data.token} />

      <label class="block">
        <span class="text-sm font-semibold text-ink-700">Password baru</span>
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
              {password !== '' && longEnough ? 'border-success/60' : ''}
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
      </label>

      <label class="block">
        <span class="text-sm font-semibold text-ink-700">Konfirmasi password</span>
        <div class="relative mt-1.5">
          <input
            type={showPassword ? "text" : "password"}
            name="confirm"
            bind:value={confirm}
            required
            autocomplete="new-password"
            class="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 pr-11 text-sm transition-colors duration-200
              {confirm !== '' && match ? 'border-success/60' : ''}
              {confirm !== '' && !match ? 'border-danger/50' : ''}
              focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus:border-primary"
            placeholder="Ulangi password"
          />
          {#if confirm !== ""}
            <span
              class="absolute right-3 top-1/2 -translate-y-1/2 {match
                ? 'text-success'
                : 'text-ink-300'}"
              aria-hidden="true"
            >
              {#if match}
                <span class="animate-[tickPop_280ms_var(--ease-out-soft)_both]">
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
              {:else}
                <Icon name="x" size={18} class="text-ink-300" />
              {/if}
            </span>
          {/if}
        </div>
        {#if confirm !== "" && !match}
          <p class="mt-1.5 text-xs font-medium text-danger">Konfirmasi belum cocok</p>
        {/if}
      </label>

      <Button type="submit" full disabled={loading || !canSubmit}>
        {#if loading}
          <Icon name="refresh" size={15} class="animate-spin" /> Memproses…
        {:else}
          <span class="btn-arrow">Reset password</span>
        {/if}
      </Button>
    </form>
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

  .icon-swap {
    display: inline-flex;
    transition: transform 180ms var(--ease-out-quad);
  }
  .icon-swap:active {
    transform: scale(0.85);
  }

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
