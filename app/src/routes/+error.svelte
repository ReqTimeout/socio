<script lang="ts">
  import { page } from "$app/stores";
</script>

<div class="grid min-h-screen place-items-center bg-surface-2 px-5 py-12">
  <div class="w-full max-w-md text-center">
    <div
      class="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-danger-100 to-warning-100 text-danger-700 shadow-card"
      aria-hidden="true"
    >
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path
          d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
        />
      </svg>
    </div>

    <p class="text-xs font-semibold uppercase tracking-widest text-danger-700">
      Error {$page.status}
    </p>
    <h1 class="mt-2 text-2xl font-bold text-ink-900">
      {$page.status === 500 ? "Server sedang bermasalah" : "Halaman tidak ditemukan"}
    </h1>
    <p class="mt-3 text-sm leading-relaxed text-ink-600">
      {$page.error?.message ?? "Terjadi kesalahan tak terduga. Coba lagi beberapa saat."}
    </p>

    <div class="mt-7 flex flex-col gap-2">
      <a
        href="/"
        class="inline-flex h-11 items-center justify-center rounded-xl bg-primary-700 px-5 text-sm font-semibold text-white shadow-card transition hover:bg-primary-800 active:scale-[0.98]"
      >
        Kembali ke beranda
      </a>
      <button
        type="button"
        onclick={() => location.reload()}
        class="inline-flex h-11 items-center justify-center rounded-xl border border-ink-200 bg-surface px-5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50 active:scale-[0.98]"
      >
        Muat ulang halaman
      </button>
    </div>

    <p class="mt-6 text-xs text-ink-500">
      Jika masalah berlanjut, hubungi admin. Kode error: <span class="font-mono"
        >{$page.status}</span
      >
    </p>
  </div>
</div>
