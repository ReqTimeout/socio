<script lang="ts">
  import { enhance } from "$app/forms";
  import { AuthBackdrop, Button, Icon } from "@socio/ui";
  import { renderTurnstile } from "$lib/turnstile";

  let { data, form } = $props<{ data: typeof data; form: import("./$types").ActionData }>();
  let loading = $state(false);
  let emailValid = $state(false);

  const sitekey = $derived(data.turnstileSitekey);
  let turnstileEl = $state<HTMLElement | null>(null);
  $effect(() => {
    if (sitekey && turnstileEl) renderTurnstile("turnstile-widget", sitekey, "forgot");
  });

  function onEmailInput(e: Event) {
    const el = e.currentTarget as HTMLInputElement;
    emailValid = el.value !== "" && el.checkValidity();
  }
</script>

<svelte:head><title>Lupa password — Socio.id</title></svelte:head>

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
        Reset password akun Anda
      </p>
    </div>

    {#if form?.success}
      <div
        class="rounded-2xl bg-success-soft text-success text-sm px-4 py-4 font-medium flex items-start gap-2.5 animate-[authIn_300ms_var(--ease-out-soft)_both]"
        role="status"
      >
        <Icon name="check" size={17} stroke={2} class="shrink-0 mt-px" />
        <span> Jika email terdaftar, link reset sudah dikirim. Cek kotak masuk Anda. </span>
      </div>
      <div class="mt-6 text-center">
        <a href="/login" class="text-sm font-semibold text-primary hover:text-primary-700"
          >Kembali ke masuk</a
        >
      </div>
    {:else}
      {#if form?.error}
        <div
          class="mb-4 rounded-2xl bg-danger-soft text-danger text-sm px-4 py-3 font-medium flex items-start gap-2.5 {form?.error
            ? 'form-shake'
            : ''}"
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
              required
              autocomplete="email"
              oninput={onEmailInput}
              class="w-full rounded-2xl border border-ink-200 bg-white px-4 py-3 pr-11 text-sm transition-colors duration-200
                {emailValid ? 'border-success/60' : ''}
                focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus:border-primary"
              placeholder="you@example.com"
            />
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
        {#if sitekey}<div id="turnstile-widget" bind:this={turnstileEl}></div>{/if}
        <Button type="submit" full disabled={loading}>
          {#if loading}
            <Icon name="refresh" size={15} class="animate-spin" /> Memproses…
          {:else}
            <span class="btn-arrow">Kirim link reset</span>
          {/if}
        </Button>
      </form>
      <div class="mt-6 text-center text-sm text-ink-500">
        <a href="/login" class="font-semibold text-primary hover:text-primary-700"
          >← Kembali ke masuk</a
        >
      </div>
    {/if}
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

  @media (prefers-reduced-motion: reduce) {
    .form-shake,
    .error-shake {
      animation: none !important;
    }
  }
</style>
