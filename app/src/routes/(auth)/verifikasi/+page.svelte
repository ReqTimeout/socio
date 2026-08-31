<script lang="ts">
  import { AuthBackdrop, Button, Icon } from "@socio/ui";

  let { data } = $props();
</script>

<svelte:head><title>Verifikasi email — Socio.id</title></svelte:head>

<div
  class="relative min-h-screen bg-ink-50 flex flex-col px-5 py-8 overflow-hidden"
  style="padding-top: max(2rem, env(safe-area-inset-top));"
>
  <AuthBackdrop variant="default" />
  <div
    class="relative z-10 flex-1 flex flex-col justify-center max-w-sm w-full mx-auto text-center"
  >
    {#if data.ok === true}
      <div
        class="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-success-soft text-success animate-[popIn_380ms_var(--ease-out-soft)_both]"
      >
        <Icon name="check" size={32} stroke={2.5} />
      </div>
      <h1
        class="font-display font-bold text-2xl text-ink-900 animate-[authIn_380ms_var(--ease-out-soft)_80ms_both]"
      >
        Email terverifikasi
      </h1>
      <p class="text-ink-500 mt-2 text-sm">Akun Anda sudah aktif. Silakan masuk.</p>
      <a href="/login" class="mt-6 inline-block font-semibold text-primary hover:text-primary-700"
        >Masuk ke akun →</a
      >
    {:else if data.resent}
      <div
        class="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-primary-100 text-primary animate-[popIn_380ms_var(--ease-out-soft)_both]"
      >
        <Icon name="mail" size={30} stroke={2} />
      </div>
      <h1
        class="font-display font-bold text-2xl text-ink-900 animate-[authIn_380ms_var(--ease-out-soft)_80ms_both]"
      >
        Link terkirim
      </h1>
      <p class="text-ink-500 mt-2 text-sm">
        Jika email <b>{data.email || "tersebut"}</b> terdaftar, link verifikasi baru sudah dikirim. Cek
        inbox &amp; spam.
      </p>
      <p class="text-ink-500 mt-1 text-[11px]">Berlaku 24 jam.</p>
      <a href="/login" class="mt-6 inline-block font-semibold text-primary hover:text-primary-700"
        >Kembali ke masuk →</a
      >
    {:else}
      <div
        class="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-warning-soft text-warning animate-[popIn_380ms_var(--ease-out-soft)_both]"
      >
        <Icon name="alert" size={30} stroke={2} />
      </div>
      <h1
        class="font-display font-bold text-2xl text-ink-900 animate-[authIn_380ms_var(--ease-out-soft)_80ms_both]"
      >
        Verifikasi gagal
      </h1>
      <p class="text-ink-500 mt-2 text-sm">Link tidak valid atau sudah kedaluwarsa.</p>

      <form
        method="GET"
        action="/verifikasi"
        class="mt-6 space-y-3 rounded-2xl border border-ink-100 bg-surface p-4 text-left"
      >
        <input type="hidden" name="resend" value="1" />
        <label class="block">
          <span class="text-sm font-semibold text-ink-700">Kirim ulang link verifikasi</span>
          <input
            type="email"
            name="email"
            required
            value={data.email ?? ""}
            class="mt-1.5 w-full rounded-xl border border-ink-200 px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus:border-primary"
            placeholder="email@domain.com"
          />
        </label>
        <Button type="submit" full><span class="btn-arrow">Kirim ulang</span></Button>
      </form>

      <a href="/login" class="mt-4 inline-block text-xs font-medium text-ink-500 hover:text-ink-600"
        >← Kembali ke masuk</a
      >
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

  @keyframes popIn {
    0% {
      opacity: 0;
      transform: scale(0.5);
    }
    70% {
      transform: scale(1.08);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  .btn-arrow {
    transition: transform 200ms var(--ease-out-quad);
  }
  form:has(button[type="submit"]:hover:not(:disabled)) .btn-arrow {
    transform: translateX(2px);
  }

  @media (prefers-reduced-motion: reduce) {
    .btn-arrow {
      transition: none !important;
    }
    form:has(button[type="submit"]:hover:not(:disabled)) .btn-arrow {
      transform: none;
    }
  }
</style>
