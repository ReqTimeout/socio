<script lang="ts">
  import { Avatar, Button, Input, toast } from "@socio/ui";
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
  let revealKey = $state(false);
  let keyBusy = $state(false);

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

  async function regenKey() {
    if (!confirm("API Key lama akan langsung nonaktif. Lanjut?")) return;
    haptic();
    keyBusy = true;
    try {
      const fd = new FormData();
      const res = await fetch("?/apiKey", { method: "POST", body: fd });
      const r = await res.json();
      if (r.type === "failure") {
        toast(r.data?.error ?? "Gagal", "error");
      } else {
        apiKey = r.data?.apiKey ?? apiKey;
        toast(r.data?.success ?? "API Key diperbarui", "success");
      }
    } catch {
      toast("Gagal", "error");
    }
    keyBusy = false;
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
            class="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-ink-900 text-[10px] text-white"
            aria-hidden="true">✎</span
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

  <!-- Forms + config — desktop 2-col premium -->
  <div class="grid gap-4 lg:grid-cols-2">
    <form
      method="POST"
      action="?/profile"
      use:enhance={submit("profile")}
      class="card-lift space-y-2 rounded-2xl border border-ink-100 bg-surface p-4 lg:p-5"
    >
      <h2 class="text-sm font-semibold">Profil</h2>
      <Input name="name" bind:value={name} placeholder="Nama lengkap" />
      <Button type="submit" size="sm" disabled={busy}>Simpan Profil</Button>
    </form>

    <form
      method="POST"
      action="?/password"
      use:enhance={submit("password")}
      class="card-lift space-y-2 rounded-2xl border border-ink-100 bg-surface p-4 lg:p-5"
    >
      <h2 class="text-sm font-semibold">Ganti Password</h2>
      <Input name="current" type="password" bind:value={current} placeholder="Password saat ini" />
      <Input name="next" type="password" bind:value={next} placeholder="Password baru (min 8)" />
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
      <Button type="submit" size="sm" variant="accent" disabled={busy}>Ubah Password</Button>
    </form>

    <div class="card-lift space-y-2 rounded-2xl border border-ink-100 bg-surface p-4 lg:p-5">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold">API Key</h2>
        <button
          type="button"
          onclick={() => (revealKey = !revealKey)}
          class="text-xs font-medium text-ink-500 hover:text-ink-900"
        >
          {revealKey ? "Sembunyikan" : "Lihat"}
        </button>
      </div>
      <div class="flex gap-2">
        <input
          readonly
          aria-label="API key"
          type={revealKey ? "text" : "password"}
          value={apiKey}
          class="h-10 flex-1 rounded-xl border border-ink-200 bg-ink-50 px-3 font-mono text-sm"
        />
        <Button onclick={copyKey} size="sm" variant="ghost">Salin</Button>
      </div>
      <Button onclick={regenKey} size="sm" variant="accent" disabled={keyBusy}>
        {keyBusy ? "Memperbarui…" : "Regenerate API Key"}
      </Button>
    </div>

    <form
      method="POST"
      action="?/theme"
      use:enhance={submit("theme")}
      class="card-lift flex items-center justify-between rounded-2xl border border-ink-100 bg-surface p-4 lg:p-5"
    >
      <span class="text-sm font-semibold">Tema</span>
      <div class="flex gap-2">
        <button
          type="submit"
          name="theme"
          value="light"
          onclick={() => {
            haptic();
            localStorage.setItem("theme", "light");
            document.documentElement.classList.remove("dark");
          }}
          class="rounded-full px-3 py-1.5 text-xs font-semibold {data.user.theme === 'light'
            ? 'bg-ink-900 text-ink-50 dark:bg-white dark:text-ink-900'
            : 'bg-ink-100 dark:bg-ink-100'}">Light</button
        >
        <button
          type="submit"
          name="theme"
          value="dark"
          onclick={() => {
            haptic();
            localStorage.setItem("theme", "dark");
            document.documentElement.classList.add("dark");
          }}
          class="rounded-full px-3 py-1.5 text-xs font-semibold {data.user.theme === 'dark'
            ? 'bg-ink-900 text-ink-50 dark:bg-white dark:text-ink-900'
            : 'bg-ink-100 dark:bg-ink-100'}">Dark</button
        >
      </div>
    </form>
  </div>

  <div
    class="surface-pop divide-y divide-ink-100 rounded-2xl border border-ink-100 bg-surface lg:grid lg:grid-cols-2 lg:divide-y-0 lg:divide-x"
  >
    <div class="divide-y divide-ink-100 lg:divide-y">
      <a
        href="/saldo/top-up"
        class="row-slide group flex items-center justify-between px-4 py-3.5 text-sm font-medium hover:bg-ink-50"
      >
        <span>Top Up Saldo</span><span
          class="text-ink-500 transition-transform duration-200 group-hover:translate-x-0.5">›</span
        >
      </a>
      <a
        href="/saldo/riwayat"
        class="row-slide group flex items-center justify-between px-4 py-3.5 text-sm font-medium hover:bg-ink-50"
      >
        <span>Riwayat Saldo</span><span
          class="text-ink-500 transition-transform duration-200 group-hover:translate-x-0.5">›</span
        >
      </a>
      <a
        href="/affiliate"
        class="row-slide group flex items-center justify-between px-4 py-3.5 text-sm font-medium hover:bg-ink-50"
      >
        <span>Affiliate</span><span
          class="text-ink-500 transition-transform duration-200 group-hover:translate-x-0.5">›</span
        >
      </a>
    </div>
    <div class="divide-y divide-ink-100 lg:divide-y">
      <a
        href="/tiket"
        class="row-slide group flex items-center justify-between px-4 py-3.5 text-sm font-medium hover:bg-ink-50"
      >
        <span>Tiket Bantuan</span><span
          class="text-ink-500 transition-transform duration-200 group-hover:translate-x-0.5">›</span
        >
      </a>
      <a
        href="/notif"
        class="row-slide group flex items-center justify-between px-4 py-3.5 text-sm font-medium hover:bg-ink-50"
      >
        <span>Notifikasi</span><span
          class="text-ink-500 transition-transform duration-200 group-hover:translate-x-0.5">›</span
        >
      </a>
      <button
        onclick={() => {
          haptic();
          if (confirm(copy.account.logoutConfirm))
            fetch("/api/auth/sign-out", { method: "POST" }).then(() => (location.href = "/login"));
        }}
        class="row-slide flex w-full items-center justify-between px-4 py-3.5 text-left text-sm font-medium text-danger hover:bg-ink-50 active:scale-[0.99]"
      >
        <span>Keluar</span><span>›</span>
      </button>
    </div>
  </div>
</section>

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
