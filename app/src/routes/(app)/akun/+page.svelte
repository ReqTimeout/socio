<script lang="ts">
  import { Avatar, Button, ConfirmDialog, Icon, Input, toast } from "@socio/ui";
  import { haptic } from "@socio/ui";
  import { copy } from "@socio/core/copy";
  import { formatRupiah } from "$lib/format";
  import { applyAction, enhance } from "$app/forms";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
  let name = $state("");
  $effect(() => {
    if (!name) name = data.user.name ?? "";
  });
  let current = $state("");
  let next = $state("");
  let busy = $state(false);

  // UX5 — toggle edit mode untuk settings rows (default collapsed)
  let editMode = $state<"profile" | "password" | "apikey" | null>(null);

  // Password strength — bar width spring-ish (CSS width transition, 0→100)
  // Heuristik sederhana: panjang + variasi kelas karakter (zxcvbn berat untuk bundle client).
  const pwScore = $derived.by(() => {
    const v = next;
    if (!v) return 0;
    let s = Math.min(v.length / 12, 0.5); // panjang maksimal setengah
    if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s += 0.15;
    if (/\d/.test(v)) s += 0.15;
    if (/[^a-zA-Z0-9]/.test(v)) s += 0.2;
    return Math.min(Math.round(s * 100), 100);
  });
  const pwLabel = $derived(
    pwScore === 0 ? "" : pwScore < 40 ? "Lemah" : pwScore < 70 ? "Sedang" : "Kuat",
  );

  // Avatar state — fail gracefully to initials if R2 has no avatar yet
  let avatarSrc = $state("");
  $effect(() => {
    if (!avatarSrc) avatarSrc = `${data.avatarUrl}?v=${Date.now()}`;
  });
  let avatarOk = $state(true);
  let avatarBusy = $state(false);
  let fileInput: HTMLInputElement | null = $state(null);

  // API key state
  let apiKey = $state("");
  $effect(() => {
    if (!apiKey) apiKey = data.user.apiKey ?? "";
  });
  let keyBusy = $state(false);
  let confirmRegen = $state(false);
  let confirmLogout = $state(false);

  async function doLogout() {
    haptic();
    try {
      await fetch("/logout", { method: "POST", credentials: "same-origin" });
    } catch {
      // Gagal jaringan — tetap redirect
    }
    window.location.assign("/login");
  }

  async function doRegenKey() {
    haptic();
    keyBusy = true;
    try {
      const fd = new FormData();
      const res = await fetch("?/apiKey", { method: "POST", body: fd });
      const r = await res.json();
      if (r.type === "failure") {
        toast(r.data?.error ?? "Gagal", "error");
      } else {
        const d = (r.data as any) ?? {};
        if (d.apiKey) apiKey = d.apiKey;
        toast(d.success ?? "API Key diperbarui", "success");
      }
    } catch {
      toast("Gagal", "error");
    } finally {
      keyBusy = false;
    }
  }

  function regenKey() {
    if (keyBusy) return;
    confirmRegen = true;
  }

  function submit(_action: string) {
    return async (input: any) => {
      busy = true;
      const r = input.result;
      if (r.type === "failure") toast(r.data?.error ?? "Gagal", "error");
      else {
        const msg =
          _action === "password"
            ? copy.account.passwordOk
            : _action === "profile"
              ? copy.account.profileOk
              : (r.data?.success ?? "Berhasil");
        toast(msg, "success");
        if (r.type !== "redirect") await applyAction(r);
      }
      busy = false;
    };
  }

  function pickAvatar() {
    haptic();
    fileInput?.click();
  }

  async function uploadAvatar(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    avatarBusy = true;
    const fd = new FormData();
    fd.append("avatar", file);
    try {
      const res = await fetch("?/avatar", { method: "POST", body: fd });
      const r = await res.json();
      if (r.type === "failure") {
        toast(r.data?.error ?? "Upload gagal", "error");
      } else {
        toast(copy.account.avatarOk, "success");
        avatarOk = true;
        avatarSrc = `${data.avatarUrl}?v=${r.data?.ts ?? Date.now()}`;
      }
    } catch {
      toast("Upload gagal", "error");
    }
    avatarBusy = false;
    input.value = "";
  }

  async function copyKey() {
    haptic();
    try {
      await navigator.clipboard.writeText(apiKey);
      toast(copy.account.apiCopied, "success");
    } catch {
      toast("Gagal menyalin", "error");
    }
  }
</script>

<svelte:head>
  <title>Akun — Socio.id | Panel SMM Indonesia</title>
  <meta
    name="description"
    content="Kelola profil, ganti password, dan atur pengaturan akun Socio.id kamu."
  />
</svelte:head>

<section class="space-y-4 lg:space-y-5">
  <h1 class="sr-only">Akun</h1>
  <!-- Header akun — desktop 2-col premium -->
  <div class="grid gap-4 lg:grid-cols-[1.45fr_0.75fr] lg:items-stretch">
    <div
      class="surface-pop flex items-center gap-4 rounded-2xl border border-ink-100 bg-surface p-4 lg:p-5"
    >
      <button
        type="button"
        onclick={pickAvatar}
        disabled={avatarBusy}
        class="relative shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95 transition-transform"
        aria-label={`Ganti avatar (${(data.user.name ?? "U")
          .split(" ")
          .map((w) => w[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()})`}
      >
        {#if avatarOk && avatarSrc}
          <img
            src={avatarSrc}
            alt={data.user.name}
            class="h-14 w-14 lg:h-16 lg:w-16 rounded-full object-cover"
            onerror={() => (avatarOk = false)}
          />
        {:else}
          <Avatar name={data.user.name} size="lg" />
        {/if}
        {#if avatarBusy}
          <span
            class="absolute inset-0 grid place-items-center rounded-full bg-ink-900/40 text-white text-[10px]"
            >…</span
          >
        {:else}
          <span
            class="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-ink-900 text-white"
            aria-hidden="true"><Icon name="edit" size={11} stroke={2.5} /></span
          >
        {/if}
      </button>
      <input
        bind:this={fileInput}
        type="file"
        accept="image/*"
        class="hidden"
        onchange={uploadAvatar}
      />
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <div class="font-display text-lg lg:text-xl font-bold truncate">{data.user.name}</div>
          <span
            class="level-shine relative inline-flex shrink-0 items-center overflow-hidden rounded-full bg-gradient-to-r from-primary to-accent-500 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white"
          >
            {data.user.level}
          </span>
        </div>
        <div class="text-sm text-ink-500 truncate">@{data.user.username}</div>
      </div>
    </div>

    <div
      class="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-accent-700 p-4 lg:p-5 text-white flex flex-col justify-center shadow-[0_16px_40px_-14px_rgba(79,70,229,0.50)]"
    >
      <div
        class="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/15 blur-2xl pointer-events-none"
      ></div>
      <div class="relative">
        <div class="text-xs text-white/70">Saldo</div>
        <div class="font-display text-2xl lg:text-3xl font-extrabold tabular-nums truncate">
          {formatRupiah(data.user.balance)}
        </div>
      </div>
    </div>
  </div>
</section>

<!-- UX5 — "Akun & Keamanan" ledger rows (Pola 2: ledger, no card chrome, hairline divider) -->
<section
  class="rounded-2xl border border-ink-100 bg-surface divide-y divide-ink-100"
  aria-label="Pengaturan akun dan keamanan"
>
  <header class="px-4 py-3 lg:px-5 lg:py-4">
    <h2 class="font-display text-base font-bold">Akun & Keamanan</h2>
    <p class="mt-0.5 text-xs text-ink-500">Profil, login, dan API akses kamu</p>
  </header>

  <!-- Row 1: Profil (ledger) -->
  <div class="px-4 py-3 lg:px-5">
    <div class="flex items-center gap-3">
      <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon name="user" size={16} stroke={2} />
      </span>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold text-ink-900">Profil</p>
        {#if editMode === "profile"}
          <form
            method="POST"
            action="?/profile"
            use:enhance={submit("profile")}
            class="mt-2 space-y-2"
          >
            <Input name="name" bind:value={name} placeholder="Nama lengkap" />
            <div class="flex gap-2">
              <Button type="submit" size="sm" disabled={busy}>Simpan</Button>
              <Button
                size="sm"
                variant="ghost"
                type="button"
                onclick={() => {
                  editMode = null;
                  name = data.user.name ?? "";
                }}>Batal</Button
              >
            </div>
          </form>
        {:else}
          <p class="text-xs text-ink-500">Nama & username publik</p>
        {/if}
      </div>
      {#if editMode !== "profile"}
        <button
          type="button"
          onclick={() => (editMode = "profile")}
          class="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-400 hover:bg-ink-50 hover:text-ink-700"
          aria-label="Edit profil"
        >
          <Icon name="edit" size={14} stroke={2} />
        </button>
      {/if}
    </div>
  </div>

  <!-- Row 2: Ganti Password (ledger) -->
  <div class="px-4 py-3 lg:px-5">
    <div class="flex items-center gap-3">
      <span
        class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-700"
      >
        <Icon name="lock" size={16} stroke={2} />
      </span>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold text-ink-900">Ganti Password</p>
        {#if editMode === "password"}
          <form
            method="POST"
            action="?/password"
            use:enhance={submit("password")}
            class="mt-2 space-y-2"
          >
            <Input
              name="current"
              type="password"
              bind:value={current}
              placeholder="Password saat ini"
            />
            <Input
              name="next"
              type="password"
              bind:value={next}
              placeholder="Password baru (min 8)"
            />
            {#if next}
              <div class="space-y-1">
                <div class="h-1.5 overflow-hidden rounded-full bg-ink-100">
                  <div
                    class="h-full rounded-full transition-all duration-300 {pwScore < 40
                      ? 'bg-danger'
                      : pwScore < 70
                        ? 'bg-amber-500'
                        : 'bg-success'}"
                    style="width:{pwScore}%"
                  ></div>
                </div>
                <p class="text-[10px] font-bold text-ink-500">
                  Kekuatan: <span
                    class={pwScore < 40
                      ? "text-danger"
                      : pwScore < 70
                        ? "text-amber-600"
                        : "text-success"}>{pwLabel}</span
                  >
                </p>
              </div>
            {/if}
            <div class="flex gap-2">
              <Button type="submit" size="sm" variant="accent" disabled={busy}>Ubah Password</Button
              >
              <Button
                size="sm"
                variant="ghost"
                type="button"
                onclick={() => {
                  editMode = null;
                  current = "";
                  next = "";
                }}>Batal</Button
              >
            </div>
          </form>
        {:else}
          <p class="text-xs text-ink-500">Update rutin biar akun tetap aman</p>
        {/if}
      </div>
      {#if editMode !== "password"}
        <button
          type="button"
          onclick={() => (editMode = "password")}
          class="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-400 hover:bg-ink-50 hover:text-ink-700"
          aria-label="Ganti password"
        >
          <Icon name="lock" size={14} stroke={2} />
        </button>
      {/if}
    </div>
  </div>

  <!-- Row 3: API Key (ledger) -->
  <div class="px-4 py-3 lg:px-5">
    <div class="flex items-center gap-3">
      <span
        class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-700"
      >
        <Icon name="shield" size={16} stroke={2} />
      </span>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold text-ink-900">API Key</p>
        {#if editMode === "apikey"}
          <div class="mt-2 flex gap-2">
            <input
              readonly
              aria-label="API key"
              type="text"
              value={apiKey}
              class="h-10 flex-1 rounded-xl border border-ink-200 bg-surface px-3 font-mono text-sm"
            />
            <Button onclick={copyKey} size="sm" variant="ghost">Salin</Button>
            <Button size="sm" variant="ghost" type="button" onclick={() => (editMode = null)}
              >Tutup</Button
            >
          </div>
          <div class="mt-2 flex items-center justify-between rounded-lg bg-ink-50 px-3 py-2">
            <p class="text-[10px] font-bold text-ink-500">
              Key lama akan langsung nonaktif setelah regenerate
            </p>
            <Button onclick={regenKey} size="sm" variant="danger" disabled={keyBusy}>
              {keyBusy ? "Memproses…" : "Regenerate"}
            </Button>
          </div>
        {:else}
          <p class="text-xs text-ink-500">Integrasi dengan tools & bot kamu</p>
        {/if}
      </div>
      {#if editMode !== "apikey"}
        <div class="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onclick={() => {
              editMode = "apikey";
            }}
            class="grid h-8 w-8 place-items-center rounded-full text-ink-400 hover:bg-ink-50 hover:text-ink-700"
            aria-label="Lihat API key"
          >
            <Icon name="eye" size={14} stroke={2} />
          </button>
          <button
            type="button"
            onclick={regenKey}
            class="inline-flex min-h-[24px] items-center px-1 text-xs font-medium text-ink-500 hover:text-danger"
          >
            Regenerate
          </button>
        </div>
      {/if}
    </div>
  </div>

  <!-- Row 4: Tema (ledger + switch) -->
  <form method="POST" action="?/theme" use:enhance={submit("theme")} class="px-4 py-3 lg:px-5">
    <div class="flex items-center gap-3">
      <span
        class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink-50 text-ink-700 dark:bg-ink-100"
      >
        <Icon name={data.user.theme === "dark" ? "moon" : "sun"} size={16} stroke={2} />
      </span>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold text-ink-900">Tema</p>
        <p class="text-xs text-ink-500">Light (default) / Dark (untuk malam)</p>
      </div>
      <div class="flex shrink-0 gap-1 rounded-full bg-ink-100 p-1 dark:bg-ink-200">
        <button
          type="submit"
          name="theme"
          value="light"
          onclick={() => {
            haptic();
            localStorage.setItem("theme", "light");
            document.documentElement.classList.remove("dark");
          }}
          aria-label="Aktifkan tema terang"
          aria-pressed={data.user.theme === "light"}
          class="rounded-full px-3 py-1 text-xs font-semibold transition {data.user.theme ===
          'light'
            ? 'bg-white text-ink-900 shadow-sm'
            : 'text-ink-500'}"
        >
          Light
        </button>
        <button
          type="submit"
          name="theme"
          value="dark"
          onclick={() => {
            haptic();
            localStorage.setItem("theme", "dark");
            document.documentElement.classList.add("dark");
          }}
          aria-label="Aktifkan tema gelap"
          aria-pressed={data.user.theme === "dark"}
          class="rounded-full px-3 py-1 text-xs font-semibold transition {data.user.theme === 'dark'
            ? 'bg-ink-900 text-ink-50'
            : 'text-ink-500'}"
        >
          Dark
        </button>
      </div>
    </div>
  </form>
</section>

<!-- UX5 — "Navigasi Cepat" quick chips (Pola 3: chips, no chrome) -->
<section aria-label="Navigasi cepat ke fitur populer" class="mt-4">
  <h2 class="px-1 text-sm font-bold">Navigasi Cepat</h2>
  <p class="mt-0.5 mb-3 px-1 text-xs text-ink-500">Langsung ke fitur populer</p>
  <ul
    class="flex gap-2 overflow-x-auto [scrollbar-width:none] lg:grid lg:grid-cols-3 lg:overflow-visible lg:gap-3"
  >
    <li class="shrink-0">
      <a
        href="/saldo/top-up"
        class="flex h-20 w-28 flex-col items-center justify-center gap-1.5 rounded-2xl border border-ink-100 bg-surface text-ink-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 active:scale-95 lg:w-auto"
      >
        <Icon name="plus" size={18} stroke={2.2} />
        <span class="text-[10px] font-bold">Top Up</span>
      </a>
    </li>
    <li class="shrink-0">
      <a
        href="/saldo/riwayat"
        class="flex h-20 w-28 flex-col items-center justify-center gap-1.5 rounded-2xl border border-ink-100 bg-surface text-ink-700 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700 active:scale-95 lg:w-auto"
      >
        <Icon name="list" size={18} stroke={2.2} />
        <span class="text-[10px] font-bold">Riwayat</span>
      </a>
    </li>
    <li class="shrink-0">
      <a
        href="/affiliate"
        class="flex h-20 w-28 flex-col items-center justify-center gap-1.5 rounded-2xl border border-ink-100 bg-surface text-ink-700 transition hover:border-pink-200 hover:bg-pink-50 hover:text-pink-700 active:scale-95 lg:w-auto"
      >
        <Icon name="gift" size={18} stroke={2.2} />
        <span class="text-[10px] font-bold">Affiliate</span>
      </a>
    </li>
    <li class="shrink-0">
      <a
        href="/tiket"
        class="flex h-20 w-28 flex-col items-center justify-center gap-1.5 rounded-2xl border border-ink-100 bg-surface text-ink-700 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700 active:scale-95 lg:w-auto"
      >
        <Icon name="ticket" size={18} stroke={2.2} />
        <span class="text-[10px] font-bold">Tiket</span>
      </a>
    </li>
    <li class="shrink-0">
      <a
        href="/notif"
        class="flex h-20 w-28 flex-col items-center justify-center gap-1.5 rounded-2xl border border-ink-100 bg-surface text-ink-700 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 active:scale-95 lg:w-auto"
      >
        <Icon name="bell" size={18} stroke={2.2} />
        <span class="text-[10px] font-bold">Notif</span>
      </a>
    </li>
    <li class="shrink-0">
      <button
        type="button"
        onclick={() => {
          haptic();
          confirmLogout = true;
        }}
        class="flex h-20 w-28 flex-col items-center justify-center gap-1.5 rounded-2xl border border-danger-soft bg-surface text-danger transition hover:bg-danger hover:text-white active:scale-95 lg:w-auto"
        aria-label="Keluar"
      >
        <Icon name="logout" size={18} stroke={2.2} />
        <span class="text-[10px] font-bold">Keluar</span>
      </button>
    </li>
  </ul>
</section>

<!-- ConfirmDialogs (P5-02/P5-01) — konsisten dengan mobile sheet, bukan native browser confirm -->
<ConfirmDialog
  bind:open={confirmRegen}
  title="Perbarui API Key?"
  message="API Key lama langsung nonaktif. Aplikasi pihak ketiga yang pakai key lama akan error sampai kamu update key-nya."
  confirmLabel="Perbarui"
  cancelLabel="Batal"
  danger
  onConfirm={doRegenKey}
/>
<ConfirmDialog
  bind:open={confirmLogout}
  title={copy.account.logoutConfirm}
  message="Kamu akan keluar dan perlu login lagi."
  confirmLabel="Keluar"
  cancelLabel="Batal"
  danger
  onConfirm={doLogout}
/>

<style>
  /* Level badge — micro-shine sweep sekali saat mount (bukan loop) */
  .level-shine::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      105deg,
      transparent 40%,
      rgb(255 255 255 / 0.35) 50%,
      transparent 60%
    );
    transform: translateX(-120%);
    animation: shine-sweep 900ms cubic-bezier(0.16, 1, 0.3, 1) 350ms forwards;
    pointer-events: none;
  }
  @keyframes shine-sweep {
    to {
      transform: translateX(120%);
    }
  }
  /* Ledger rows — stagger reveal */
  .row-slide {
    animation: row-in 320ms cubic-bezier(0.16, 1, 0.3, 1) backwards;
  }
  .row-slide:nth-child(1) {
    animation-delay: 60ms;
  }
  .row-slide:nth-child(2) {
    animation-delay: 100ms;
  }
  .row-slide:nth-child(3) {
    animation-delay: 140ms;
  }
  @keyframes row-in {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .level-shine::after,
    .row-slide {
      animation: none;
    }
    .row-slide {
      opacity: 1;
    }
  }
</style>
