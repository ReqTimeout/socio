<script lang="ts">
  let { data } = $props();
</script>

<svelte:head><title>Verifikasi email — Socio.id</title></svelte:head>

<div
  class="min-h-screen bg-ink-50 flex flex-col px-5 py-8"
  style="padding-top: max(2rem, env(safe-area-inset-top));"
>
  <div class="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto text-center">
    {#if data.ok}
      <div class="text-5xl mb-4">✅</div>
      <h1 class="font-display font-bold text-2xl text-ink-900">Email terverifikasi</h1>
      <p class="text-ink-500 mt-2 text-sm">Akun Anda sudah aktif. Silakan masuk.</p>
    {:else}
      <div class="text-5xl mb-4">⚠️</div>
      <h1 class="font-display font-bold text-2xl text-ink-900">Verifikasi gagal</h1>
      <p class="text-ink-500 mt-2 text-sm">Link tidak valid atau sudah kedaluwarsa.</p>
    {/if}
    <a href="/login" class="mt-6 inline-block font-semibold text-primary hover:text-primary-700"
      >Masuk ke akun →</a
    >
  </div>
</div>
