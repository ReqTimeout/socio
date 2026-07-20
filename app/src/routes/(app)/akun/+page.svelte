<script lang="ts">
  import { Avatar, Button, Input, toast } from "@socio/ui";
  import { haptic } from "@socio/ui";
  import { formatRupiah } from "$lib/format";
  import { applyAction, enhance } from "$app/forms";
  import type { ActionData, PageData } from "./$types";

  let { data, form }: { data: PageData; form: ActionData } = $props();
  let name = $state(data.user.name);
  let current = $state("");
  let next = $state("");
  let busy = $state(false);

  // Avatar state — fail gracefully to initials if R2 has no avatar yet
  let avatarSrc = $state(`${data.avatarUrl}?v=${Date.now()}`);
  let avatarOk = $state(true);
  let avatarBusy = $state(false);
  let fileInput: HTMLInputElement | null = $state(null);

  // API key state
  let apiKey = $state(data.user.apiKey);
  let revealKey = $state(false);
  let keyBusy = $state(false);

  function submit(action: string) {
    return async (input: any) => {
      busy = true;
      const r = input.result;
      if (r.type === "failure") toast(r.data?.error ?? "Gagal", "error");
      else {
        toast(r.data?.success ?? "Berhasil", "success");
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
        toast(r.data?.success ?? "Avatar diperbarui", "success");
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
      toast("API Key disalin", "success");
    } catch {
      toast("Gagal menyalin", "error");
    }
  }
</script>

<section class="space-y-5">
  <div class="flex items-center gap-4 rounded-2xl border border-ink-100 bg-surface p-4">
    <button
      type="button"
      onclick={pickAvatar}
      disabled={avatarBusy}
      class="relative shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95 transition-transform"
      aria-label="Ganti avatar"
    >
      {#if avatarOk && avatarSrc}
        <img
          src={avatarSrc}
          alt={data.user.name}
          class="h-14 w-14 rounded-full object-cover"
          onerror={() => (avatarOk = false)}
        />
      {:else}
        <Avatar name={data.user.name} size="lg" />
      {/if}
      {#if avatarBusy}
        <span class="absolute inset-0 grid place-items-center rounded-full bg-ink-900/40 text-white text-[10px]">…</span>
      {:else}
        <span
          class="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-ink-900 text-[10px] text-white"
          aria-hidden="true"
        >✎</span>
      {/if}
    </button>
    <input
      bind:this={fileInput}
      type="file"
      accept="image/*"
      class="hidden"
      onchange={uploadAvatar}
    />
    <div>
      <div class="font-display text-lg font-bold">{data.user.name}</div>
      <div class="text-sm text-ink-500">@{data.user.username} · {data.user.level}</div>
    </div>
  </div>

  <div class="rounded-2xl bg-ink-900 p-4 text-white">
    <div class="text-xs text-ink-300">Saldo</div>
    <div class="font-display text-2xl font-extrabold tabular-nums">
      {formatRupiah(data.user.balance)}
    </div>
  </div>

  <!-- Profile -->
  <form
    method="POST"
    action="?/profile"
    use:enhance={submit("profile")}
    class="space-y-2 rounded-2xl border border-ink-100 bg-surface p-4"
  >
    <h2 class="text-sm font-semibold">Profil</h2>
    <Input name="name" bind:value={name} placeholder="Nama lengkap" />
    <Button type="submit" size="sm" disabled={busy}>Simpan Profil</Button>
  </form>

  <!-- Password -->
  <form
    method="POST"
    action="?/password"
    use:enhance={submit("password")}
    class="space-y-2 rounded-2xl border border-ink-100 bg-surface p-4"
  >
    <h2 class="text-sm font-semibold">Ganti Password</h2>
    <Input name="current" type="password" bind:value={current} placeholder="Password saat ini" />
    <Input name="next" type="password" bind:value={next} placeholder="Password baru (min 8)" />
    <Button type="submit" size="sm" variant="accent" disabled={busy}>Ubah Password</Button>
  </form>

  <!-- API Key -->
  <div class="space-y-2 rounded-2xl border border-ink-100 bg-surface p-4">
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

  <!-- Theme -->
  <form
    method="POST"
    action="?/theme"
    use:enhance={submit("theme")}
    class="flex items-center justify-between rounded-2xl border border-ink-100 bg-surface p-4"
  >
    <span class="text-sm font-semibold">Tema</span>
    <div class="flex gap-2">
      <button
        type="submit"
        name="theme"
        value="light"
        onclick={() => haptic()}
        class="rounded-full px-3 py-1.5 text-xs font-semibold {data.user.theme === 'light'
          ? 'bg-ink-900 text-white'
          : 'bg-ink-100'}">Light</button
      >
      <button
        type="submit"
        name="theme"
        value="dark"
        onclick={() => haptic()}
        class="rounded-full px-3 py-1.5 text-xs font-semibold {data.user.theme === 'dark'
          ? 'bg-ink-900 text-white'
          : 'bg-ink-100'}">Dark</button
      >
    </div>
  </form>

  <div class="divide-y divide-ink-100 rounded-2xl border border-ink-100 bg-surface">
    <a
      href="/saldo/top-up"
      class="flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-ink-50"
    >
      <span>Top Up Saldo</span><span class="text-ink-400">›</span>
    </a>
    <a
      href="/affiliate"
      class="flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-ink-50"
    >
      <span>Affiliate</span><span class="text-ink-400">›</span>
    </a>
    <a
      href="/tiket"
      class="flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-ink-50"
    >
      <span>Tiket Bantuan</span><span class="text-ink-400">›</span>
    </a>
    <button
      onclick={() => {
        haptic();
        fetch("/api/auth/sign-out", { method: "POST" }).then(() => (location.href = "/login"));
      }}
      class="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-danger hover:bg-ink-50"
    >
      <span>Keluar</span><span>›</span>
    </button>
  </div>
</section>
