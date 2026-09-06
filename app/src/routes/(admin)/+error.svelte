<script lang="ts">
  import { page } from "$app/stores";
  import { Icon } from "@socio/ui";

  let err = $derived($page.error as any);
  let status = $derived((err as any)?.status ?? $page.status);
  let message = $derived((err as any)?.message ?? (err as any)?.body?.message ?? "");
</script>

<svelte:head>
  <title>{status === 403 ? "Akses ditolak — Socio Admin" : `Error ${status} — Socio Admin`}</title>
</svelte:head>

<div
  class="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center"
>
  <div
    class="grid h-16 w-16 place-items-center rounded-2xl {status === 403
      ? 'bg-amber-100 text-amber-600'
      : 'bg-danger/10 text-danger'}"
  >
    <Icon name={status === 403 ? "shield" : "alert"} size={32} />
  </div>
  <h1 class="mt-6 font-display text-2xl font-extrabold tracking-tight text-ink-900">
    {#if status === 403}
      Akses ditolak
    {:else if status === 404}
      Halaman tidak ditemukan
    {:else}
      Terjadi kesalahan
    {/if}
  </h1>
  <p class="mt-2 max-w-sm text-sm leading-relaxed text-ink-500">
    {#if status === 403}
      {message || "Role kamu tidak punya izin untuk halaman ini. Hubungi super admin untuk akses."}
    {:else if status === 404}
      Halaman yang kamu cari tidak ada atau sudah dipindahkan.
    {:else}
      {message || "Terjadi kesalahan tak terduga. Coba muat ulang."}
    {/if}
  </p>
  <div class="mt-8 flex flex-wrap justify-center gap-3">
    <a
      href="/admin"
      class="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-ink-800"
    >
      <Icon name="home" size={16} />
      Ke Dashboard
    </a>
    <button
      type="button"
      onclick={() => history.back()}
      class="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-surface px-5 py-2.5 text-sm font-bold text-ink-700 transition hover:bg-ink-50"
    >
      <Icon name="chevron_left" size={16} />
      Kembali
    </button>
  </div>
  {#if status === 403}
    <p class="mt-6 text-xs text-ink-400">
      Butuh akses? Hubungi super admin untuk ubah role di <span class="font-mono"
        >/admin/settings</span
      >.
    </p>
  {/if}
</div>
